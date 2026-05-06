"""Functional tests for the Foundation Milestone (M1) contract.

These tests verify the specific contract defined in MILESTONE.md section
"Foundation Milestone": the URL-preservation guarantee, the inline theme
bootstrap, the shared chrome (Nav + Footer) on every page, the CNAME
deployment artifact, and the requirement that global URLs (LinkedIn,
Facebook, mailto, membership form, Luma calendar) are routed through the
`src/content/site/social.json` collection — not hard-coded.

After the test-side fix in commit f00049d this file additionally guards
against any regression in what the served pages actually contain (the prior
review caught hard-coded social URLs that have since been migrated to the
collection).

Run against the preview server brought up by the lifecycle `run` script
(`pnpm preview` on http://127.0.0.1:4321).
"""
from __future__ import annotations

import json
import os
import re

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10
DIST_DIR = "/l2l/workspace/lafrenchtechdenver/dist"
SITE_SOCIAL_JSON_PATH = (
    "/l2l/workspace/lafrenchtechdenver/src/content/site/social.json"
)

# The six URLs the legacy site exposed. `build.format: 'file'` in
# astro.config.mjs is load-bearing — any of these dropping to 404 breaks
# inbound links, bookmarks, and search-engine results.
LEGACY_URLS = [
    "/",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# Nav references all six destinations on every page. `/` is the home; the
# canonical nav href for it is `/index.html`.
NAV_HREFS = [
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]


def _load_site_social():
    """Read site/social.json — the single source of truth for global URLs."""
    with open(SITE_SOCIAL_JSON_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def site_social():
    return _load_site_social()


@pytest.fixture(autouse=True)
def preview_server_up():
    """Confirm the Astro preview server is reachable before every test."""
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


# --------------------------------------------------------------------------
# 1. URL contract — every legacy .html URL serves 200
# --------------------------------------------------------------------------


class TestUrlContract:
    """Each legacy URL still resolves 200 with text/html."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_url_responds_200(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET {path} -> {resp.status_code}; URL preservation contract broken"
        )
        ct = resp.headers.get("content-type", "")
        assert "text/html" in ct, (
            f"GET {path} content-type: {ct!r} (expected text/html)"
        )


# --------------------------------------------------------------------------
# 2. Home page hero copy — required by the lifecycle healthcheck
# --------------------------------------------------------------------------


class TestHomePageContent:
    """`/` renders the hero, title, and main page-defining content."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_site_title_in_body(self, html):
        # The healthcheck script greps for this exact phrase. Same phrase
        # also appears in the footer + meta tags.
        assert "La French Tech Denver" in html, (
            "Home page response body does not contain 'La French Tech Denver'"
        )


# --------------------------------------------------------------------------
# 3. Inline theme bootstrap — must be in <head>, must be synchronous
# --------------------------------------------------------------------------


class TestThemeBootstrapInline:
    """`keep_theme_bootstrap_inline_in_head.md` invariant: bootstrap is sync inline in <head>."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_data_theme_bootstrap_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # The bootstrap reads localStorage.theme and sets data-theme before
        # paint. Both literal markers must appear.
        assert "localStorage.getItem('theme')" in html, (
            f"{path}: theme bootstrap missing localStorage.getItem('theme')"
        )
        assert "setAttribute('data-theme'" in html, (
            f"{path}: theme bootstrap missing setAttribute('data-theme')"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_is_in_head(self, path):
        # The bootstrap <script> must live inside <head>, not <body>. A
        # deferred or body-side script reintroduces the FOUC the inline
        # bootstrap exists to avoid.
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        head_match = re.search(r"<head[^>]*>(.*?)</head>", html, re.DOTALL | re.IGNORECASE)
        assert head_match, f"{path}: <head> block not found"
        head_html = head_match.group(1)
        assert "setAttribute('data-theme'" in head_html, (
            f"{path}: theme bootstrap is not inside <head> — moved to body or deferred"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_script_is_synchronous(self, path):
        # The bootstrap <script> must NOT be `defer`, `async`, or `type=module`
        # — any of those defers execution past the first paint and reintroduces
        # the FOUC. We locate the script tag containing the bootstrap and
        # assert none of the deferring attributes are present.
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # Find any <script ...> ... setAttribute('data-theme'... ... </script>
        m = re.search(
            r"<script\b([^>]*)>([^<]*setAttribute\('data-theme'[^<]*)</script>",
            html,
            re.DOTALL,
        )
        assert m, f"{path}: bootstrap <script> not located"
        attrs = m.group(1).lower()
        assert " defer" not in attrs, f"{path}: bootstrap script has `defer`"
        assert " async" not in attrs, f"{path}: bootstrap script has `async`"
        assert "type=\"module\"" not in attrs and "type='module'" not in attrs, (
            f"{path}: bootstrap script has type=module"
        )


# --------------------------------------------------------------------------
# 4. Shared chrome — Nav with all six links + Footer on every page
# --------------------------------------------------------------------------


class TestSharedChromeNav:
    """`Nav.astro` rendered through BaseLayout exposes all six links on every page."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_nav_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # The Nav element root has class "nav" and a <ul class="menu">.
        assert "<nav " in html or "<nav>" in html, f"{path}: <nav> tag missing"
        assert 'class="menu"' in html, f"{path}: nav menu container missing"

    @pytest.mark.parametrize("path", LEGACY_URLS)
    @pytest.mark.parametrize("href", NAV_HREFS)
    def test_nav_contains_link(self, path, href):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert f'href="{href}"' in resp.text, (
            f"{path}: nav missing link to {href}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_to_content_link_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # Skip-link contract: visible-on-focus, points at #main-content.
        assert 'href="#main-content"' in html, (
            f"{path}: skip-to-content link missing href='#main-content'"
        )
        assert 'class="skip-link"' in html, (
            f"{path}: skip-link element missing class='skip-link'"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_main_content_landmark(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'id="main-content"' in html, (
            f"{path}: <main id='main-content'> landmark missing"
        )


class TestSharedChromeFooter:
    """`Footer.astro` rendered through BaseLayout on every page."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_footer_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "<footer" in html, f"{path}: <footer> tag missing"

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_footer_copyright_line(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "Community-run in Denver, CO" in html, (
            f"{path}: legacy footer copy 'Community-run in Denver, CO' missing"
        )


# --------------------------------------------------------------------------
# 5. CNAME deployment artifact — present in dist/, served verbatim
# --------------------------------------------------------------------------


class TestCnameContract:
    """`dist/CNAME` exists with exactly `lafrenchtechdenver.com`."""

    def test_dist_cname_file_exists(self):
        path = os.path.join(DIST_DIR, "CNAME")
        assert os.path.isfile(path), (
            f"dist/CNAME missing — GitHub Pages will detach the custom domain"
        )

    def test_dist_cname_body_is_apex_domain(self):
        path = os.path.join(DIST_DIR, "CNAME")
        with open(path, "r", encoding="utf-8") as fh:
            body = fh.read().strip()
        # Must be EXACTLY the apex domain — any extra content (a comment,
        # a second line, a different domain) detaches the live site.
        assert body == "lafrenchtechdenver.com", (
            f"dist/CNAME content {body!r}, expected exactly 'lafrenchtechdenver.com'"
        )

    def test_cname_served_verbatim_over_http(self):
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /CNAME -> {resp.status_code}; preview is not serving the CNAME file"
        )
        assert resp.text.strip() == "lafrenchtechdenver.com", (
            f"GET /CNAME body {resp.text.strip()!r}, expected exactly 'lafrenchtechdenver.com'"
        )


# --------------------------------------------------------------------------
# 6. Global URLs routed through site/social.json — the f00049d contract
# --------------------------------------------------------------------------


class TestGlobalUrlsFromSiteCollection:
    """LinkedIn / Facebook / mailto / membership / Luma URLs come from site/social.json.

    Per `route_global_constants_through_site_collection.md`, these URLs must
    not be hard-coded in components or pages — they live in
    `src/content/site/social.json` and flow into pages via
    `getEntry('site', 'social')`. The served HTML must contain the exact
    values from that JSON file. Commit f00049d migrated the last hard-coded
    occurrences; this test guards against regression.
    """

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_linkedin_url(self, path, site_social):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        url = site_social["linkedinUrl"]
        assert f'href="{url}"' in resp.text, (
            f"{path}: served LinkedIn URL does not match site/social.json ({url!r})"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_facebook_url(self, path, site_social):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        url = site_social["facebookUrl"]
        assert f'href="{url}"' in resp.text, (
            f"{path}: served Facebook URL does not match site/social.json ({url!r})"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_mailto_url(self, path, site_social):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        email = site_social["contactEmail"]
        assert f'href="mailto:{email}"' in resp.text, (
            f"{path}: served mailto link does not match site/social.json contactEmail "
            f"({email!r})"
        )

    def test_membership_form_url_on_home(self, site_social):
        # `/` and `/members-benefits.html` show the Google Form CTA.
        url = site_social["membershipFormUrl"]
        for path in ("/", "/members-benefits.html"):
            resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
            assert f'href="{url}"' in resp.text, (
                f"{path}: membership form CTA does not match site/social.json "
                f"membershipFormUrl ({url!r})"
            )

    def test_luma_calendar_url_on_events(self, site_social):
        url = site_social["lumaCalendarUrl"]
        resp = requests.get(f"{BASE_URL}/events.html", timeout=TIMEOUT)
        assert f'src="{url}"' in resp.text, (
            f"/events.html: Luma iframe src does not match site/social.json "
            f"lumaCalendarUrl ({url!r})"
        )
