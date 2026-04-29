"""Functional tests for the Milestone 2 accessibility baseline.

Milestone 2 added an explicit a11y baseline to BaseLayout.astro:
  - skip-to-content link is the first focusable element on every page
  - <main id="main-content"> wraps page content
  - Inline theme bootstrap stays in <head> (FOUC prevention contract)
  - The skip-link's target matches main's id (#main-content)

These are HTTP-level assertions against the rendered HTML — they do not run
in a browser (frontend interaction tests live in tests/a11y-basic.spec.ts and
are owned by the fe_tester subagent).

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import re

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# All six legacy URLs must satisfy the a11y baseline. We check `/` and
# `/index.html` separately because they are different routes that both must
# render the same baseline.
LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]


@pytest.fixture(autouse=True)
def preview_server_up():
    """Confirm the Astro preview server is reachable before every test."""
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestSkipLinkBaseline:
    """The skip-to-content link is the first focusable element on every page."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_link_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        html = resp.text
        # The skip-link uses the .skip-link class and points at #main-content.
        assert 'class="skip-link"' in html, (
            f"{path}: missing `class=\"skip-link\"` element — skip-to-content "
            f"is the first focusable element required by the a11y baseline"
        )
        assert 'href="#main-content"' in html, (
            f"{path}: skip link is not anchored to #main-content"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_link_has_visible_text(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # The exact label is "Skip to content" — covered by Playwright a11y
        # spec; we assert the literal here so a typo is caught at HTTP level.
        assert "Skip to content" in html, (
            f"{path}: skip-link text 'Skip to content' missing"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_link_is_first_focusable(self, path):
        """The skip-link must appear in DOM order before <header class="nav">.

        If it lands inside or after the nav, a Tab-key user cannot use it to
        bypass the menu — that's the entire purpose of the link.
        """
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # Find the position of the skip-link and the nav header.
        skip_match = re.search(r'<a[^>]*class="skip-link"', html)
        assert skip_match, f"{path}: no skip-link <a> found"
        nav_match = re.search(r'<header[^>]*class="nav"', html)
        assert nav_match, f"{path}: no <header class=\"nav\"> found"
        assert skip_match.start() < nav_match.start(), (
            f"{path}: skip-link appears AFTER the nav header in the DOM "
            f"(skip @ {skip_match.start()}, nav @ {nav_match.start()}); "
            f"keyboard users cannot bypass the menu"
        )


class TestMainLandmark:
    """Every page wraps its content in <main id="main-content">."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_main_landmark_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        html = resp.text
        # The id="main-content" must match the skip-link href anchor.
        assert '<main id="main-content">' in html, (
            f"{path}: missing <main id=\"main-content\"> landmark — the "
            f"skip-link target will not resolve"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_main_appears_after_nav(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        nav_pos = html.find('<header class="nav">')
        main_pos = html.find('<main id="main-content">')
        assert nav_pos != -1, f"{path}: <header class=\"nav\"> not found"
        assert main_pos != -1, f"{path}: <main id=\"main-content\"> not found"
        assert nav_pos < main_pos, (
            f"{path}: <main> appears before <header class=\"nav\">; "
            f"document order should be skip-link, nav, main, footer"
        )


class TestThemeBootstrapInline:
    """The theme bootstrap script stays inline in <head> (FOUC contract)."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_present_in_head(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # Locate <head>...</head>.
        head_match = re.search(r'<head[^>]*>(.*?)</head>', html, re.DOTALL | re.IGNORECASE)
        assert head_match, f"{path}: no <head> block found"
        head = head_match.group(1)
        # The bootstrap reads localStorage.theme and sets data-theme synchronously.
        assert "localStorage.getItem('theme')" in head, (
            f"{path}: theme bootstrap not found in <head>; FOUC will appear on dark-mode reload"
        )
        assert "setAttribute('data-theme'" in head, (
            f"{path}: theme bootstrap in <head> does not set data-theme attribute"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_is_inline_script(self, path):
        """The bootstrap must be a synchronous inline <script>, not a module
        or a deferred external script — otherwise it runs after first paint."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # Astro emits `is:inline` as an inline <script> with no `type="module"`,
        # `defer`, or `async` attribute. We check that the snippet around the
        # bootstrap call looks like a plain inline script.
        idx = html.find("localStorage.getItem('theme')")
        assert idx != -1, f"{path}: bootstrap localStorage call missing"
        # Walk backwards to the nearest <script tag.
        head_chunk = html[:idx]
        script_open = head_chunk.rfind("<script")
        assert script_open != -1, f"{path}: bootstrap not wrapped in <script>"
        script_tag = html[script_open:idx]
        # Disallow async/defer/module — these defeat the no-FOUC purpose.
        assert ' defer' not in script_tag, (
            f"{path}: theme bootstrap script has `defer` attribute — runs after parse"
        )
        assert ' async' not in script_tag, (
            f"{path}: theme bootstrap script has `async` attribute"
        )
        assert 'type="module"' not in script_tag, (
            f"{path}: theme bootstrap script is a module — modules are deferred by default"
        )


class TestNavAndSocialAndToggle:
    """The new shared components render on every page (full nav contract)."""

    NAV_HREFS = [
        "/index.html",
        "/about.html",
        "/companies-sponsors.html",
        "/members-benefits.html",
        "/events.html",
        "/resources.html",
    ]

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_six_nav_links_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        for href in self.NAV_HREFS:
            assert f'href="{href}"' in html, (
                f"{path}: nav is missing link to {href}"
            )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_social_links_render(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # SocialLinks.astro defaults — LinkedIn, Facebook, mailto.
        assert 'href="https://www.linkedin.com/company/denver-french-tech"' in html, (
            f"{path}: LinkedIn link missing"
        )
        assert 'href="https://www.facebook.com/groups/lafrenchtechdenver/"' in html, (
            f"{path}: Facebook link missing"
        )
        assert 'href="mailto:contact@lafrenchtechdenver.com"' in html, (
            f"{path}: mailto link missing"
        )
        # The wrapping container has the .social-links class.
        assert 'class="social-links"' in html, (
            f"{path}: .social-links container missing"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_theme_toggle_button_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'id="theme-toggle"' in html, (
            f"{path}: <button id=\"theme-toggle\"> missing"
        )
        assert 'class="theme-toggle"' in html, (
            f"{path}: theme-toggle is missing the .theme-toggle class hook"
        )
