"""Functional tests for Milestone 4 — secondary pages, image pipeline, sitemap.

Milestone 4 promotes the four placeholder pages (companies-sponsors, events,
members-benefits, resources) to real Astro pages with content sourced from
content collections, wires the Astro <Image> pipeline for hero/board/partner
images, and ensures the build emits the deployment artifacts (CNAME, sitemap,
per-page .html files) required by GitHub Pages.

These tests are HTTP-only — frontend interaction tests live in `tests/`.
They run against the preview server brought up by the lifecycle `run` script
(`pnpm preview` on http://127.0.0.1:4321).
"""
from __future__ import annotations

import os
import re

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10
DIST_DIR = "/l2l/workspace/lafrenchtechdenver/dist"

# Values authored in src/content/site/social.json — every page reads these
# via `getEntry('site', 'social')`. Hard-coded duplication of these strings
# in components or pages is forbidden by the
# `route_global_constants_through_site_collection` instruction.
LINKEDIN_URL = "https://www.linkedin.com/company/denver-french-tech"
FACEBOOK_URL = "https://www.facebook.com/groups/lafrenchtechdenver/"
CONTACT_EMAIL = "contact@lafrenchtechdenver.com"
MEMBERSHIP_FORM_URL = (
    "https://docs.google.com/forms/d/"
    "1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM/viewform"
)
LUMA_CALENDAR_URL = "https://luma.com/embed/calendar/cal-LmVz8RcUWX6HYaA/events"

# All six legacy URLs — the URL-preservation contract from M1.
ALL_PAGES = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# Just the M4-promoted secondary pages. /about.html was already promoted in M3.
M4_PROMOTED_PAGES = [
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# The exact URLs that must appear in the sitemap, with .html suffix preserved.
SITEMAP_HTML_URLS = [
    "https://lafrenchtechdenver.com/index.html",
    "https://lafrenchtechdenver.com/about.html",
    "https://lafrenchtechdenver.com/companies-sponsors.html",
    "https://lafrenchtechdenver.com/events.html",
    "https://lafrenchtechdenver.com/members-benefits.html",
    "https://lafrenchtechdenver.com/resources.html",
]


@pytest.fixture(autouse=True)
def preview_server_up():
    """Confirm the Astro preview server is reachable before every test."""
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


# --------------------------------------------------------------------------
# Static-site HTTP contract — every page must return 200
# --------------------------------------------------------------------------


class TestPagesReturn200:
    """Every page in the M4 set must return HTTP 200 from the preview server."""

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_page_returns_200(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET {path} -> {resp.status_code}; expected 200 "
            f"(preview is serving dist/, so a non-200 means the static "
            f"page was never built)."
        )

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_page_is_html(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        ct = resp.headers.get("content-type", "")
        assert "html" in ct.lower(), (
            f"{path}: served with non-html content-type: {ct!r}"
        )

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_page_has_doctype(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        # Static-site sanity: the response must be a real HTML document.
        assert resp.text.lower().lstrip().startswith("<!doctype html"), (
            f"{path}: response does not start with <!doctype html>"
        )


# --------------------------------------------------------------------------
# Companies & Sponsors — promoted from placeholder
# --------------------------------------------------------------------------


class TestCompaniesSponsorsPage:
    """`/companies-sponsors.html` is no longer a placeholder."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(
            f"{BASE_URL}/companies-sponsors.html", timeout=TIMEOUT
        )
        assert resp.status_code == 200
        return resp.text

    def test_page_title_renders(self, html):
        # Astro escapes & to &amp; — match the actual emitted markup.
        assert "<title>Companies &amp; Sponsors — La French Tech Denver</title>" in html

    def test_hero_heading_rendered(self, html):
        assert "<h1>Companies &amp; Sponsors</h1>" in html, (
            "Companies & Sponsors hero <h1> missing"
        )

    def test_friends_section_rendered(self, html):
        assert "<h2>Friends</h2>" in html, "Friends section heading missing"

    def test_two_partner_cards_rendered(self, html):
        # M4 spec: exactly the 2 partners with `featuredOn: ['sponsors']`
        # — Techstars and Finmark.
        cards = re.findall(r'data-testid="partner-card"', html)
        assert len(cards) == 2, (
            f"Expected exactly 2 partner cards on /companies-sponsors.html, "
            f"got {len(cards)}. Check `featuredOn` arrays in src/content/partners/*.md"
        )

    def test_techstars_partner_present(self, html):
        assert "<h4>Techstars</h4>" in html, "Techstars partner card missing"
        assert 'href="https://techstars.com"' in html, (
            "Techstars URL missing on companies-sponsors page"
        )

    def test_finmark_partner_present(self, html):
        assert "<h4>Finmark</h4>" in html, "Finmark partner card missing"
        assert 'href="https://finmark.com"' in html, (
            "Finmark URL missing on companies-sponsors page"
        )

    def test_supporters_html_comment_preserved(self, html):
        # The legacy companies-sponsors.html shipped a commented-out
        # "Supporters" block. M4 preserves the pattern as a literal HTML
        # comment so future contributors discover the convention.
        assert "<!--" in html and "Supporters" in html, (
            "Supporters HTML-comment block missing from companies-sponsors.html"
        )
        # The comment must NOT render visible "Supporters" content as a heading.
        assert "<h2>Supporters</h2>" not in html, (
            "Supporters block should be commented out, not visible"
        )

    def test_no_placeholder_marker(self, html):
        assert "Coming soon" not in html, (
            "companies-sponsors.html still contains 'Coming soon' marker"
        )


# --------------------------------------------------------------------------
# Events page — Luma iframe wired to site.json
# --------------------------------------------------------------------------


class TestEventsPage:
    """`/events.html` renders the Luma iframe whose src comes from site.json."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/events.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_hero_heading_rendered(self, html):
        assert "<h1>Events</h1>" in html, "Events hero <h1> missing"

    def test_iframe_src_matches_site_collection(self, html):
        # The iframe `src` is read from
        # `src/content/site/social.json.lumaCalendarUrl` per the
        # `route_global_constants_through_site_collection` instruction.
        # Searching for the literal URL guards against accidental hard-coding
        # of the wrong calendar URL.
        assert f'src="{LUMA_CALENDAR_URL}"' in html, (
            f"Luma iframe src does not match site.json lumaCalendarUrl "
            f"({LUMA_CALENDAR_URL!r}); check src/content/site/social.json"
        )

    def test_iframe_responsive_container_present(self, html):
        # The legacy embed had a fixed 600px iframe height that
        # horizontal-scrolled below 768px. M4 wraps the iframe in
        # `.events-frame` (responsive aspect-ratio container).
        assert 'class="events-frame"' in html, (
            "events-frame responsive container missing"
        )
        assert 'data-testid="events-iframe-container"' in html, (
            "events-iframe-container test hook missing"
        )

    def test_iframe_has_lazy_loading(self, html):
        assert 'loading="lazy"' in html, "Luma iframe missing loading=lazy"

    def test_iframe_has_title_attribute(self, html):
        # WCAG: iframes require a `title` for assistive tech.
        assert (
            'title="La French Tech Denver — Luma calendar"' in html
        ), "Luma iframe missing accessible title attribute"

    def test_no_placeholder_marker(self, html):
        assert "Coming soon" not in html


# --------------------------------------------------------------------------
# Members Benefits page — two cards + CTA from site.json
# --------------------------------------------------------------------------


class TestMembersBenefitsPage:
    """`/members-benefits.html` shows two benefit cards + Google-Form CTA."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/members-benefits.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_hero_heading_rendered(self, html):
        assert "<h1>Members Benefits</h1>" in html, "Members Benefits <h1> missing"

    def test_individuals_card_present(self, html):
        assert "<h2>For Individuals</h2>" in html, "Individuals card missing"

    def test_companies_card_present(self, html):
        assert "<h2>For Companies</h2>" in html, "Companies card missing"

    def test_individual_benefits_list(self, html):
        for line in [
            "Free entry to all our community events",
            "Direct access to a curated network of founders, operators, and investors",
            "Mentorship pairings with experienced French-speaking entrepreneurs",
        ]:
            assert line in html, f"Individual benefit line missing: {line!r}"

    def test_company_benefits_list(self, html):
        for line in [
            "Promotion of your job openings and events to the membership",
            "Sponsorship opportunities at our flagship gatherings",
            "Connections to French startups expanding into the US market",
        ]:
            assert line in html, f"Company benefit line missing: {line!r}"

    def test_become_a_member_cta_label(self, html):
        # The CTA button label.
        assert re.search(
            r'<a class="cta"[^>]*>\s*Become a Member\s*</a>', html
        ), "Become a Member CTA anchor missing"

    def test_cta_href_from_site_collection(self, html):
        # The CTA href must come from site.json.membershipFormUrl.
        assert f'href="{MEMBERSHIP_FORM_URL}"' in html, (
            f"CTA href does not match site.json membershipFormUrl "
            f"({MEMBERSHIP_FORM_URL!r})"
        )

    def test_cta_opens_in_new_tab(self, html):
        match = re.search(
            r'<a class="cta"[^>]*href="' + re.escape(MEMBERSHIP_FORM_URL) + r'"[^>]*>',
            html,
        )
        assert match, "CTA anchor with membership-form href not found"
        assert 'target="_blank"' in match.group(0), "CTA missing target=_blank"
        assert 'rel="noopener"' in match.group(0), "CTA missing rel=noopener"

    def test_no_placeholder_marker(self, html):
        assert "Coming soon" not in html


# --------------------------------------------------------------------------
# Resources page
# --------------------------------------------------------------------------


class TestResourcesPage:
    """`/resources.html` renders the welcometofrance.com card."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/resources.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_hero_heading_rendered(self, html):
        assert "<h1>Resources</h1>" in html, "Resources <h1> missing"

    def test_welcome_to_france_card_present(self, html):
        assert "<h2>Welcome to France</h2>" in html, (
            "Welcome to France card heading missing"
        )

    def test_welcome_to_france_link_renders(self, html):
        assert 'href="https://welcometofrance.com"' in html, (
            "welcometofrance.com link missing on /resources.html"
        )

    def test_welcome_to_france_cta_label(self, html):
        # CTA label uses the visible domain text.
        assert "Visit welcometofrance.com" in html, (
            "Visit welcometofrance.com CTA label missing"
        )

    def test_link_opens_in_new_tab(self, html):
        match = re.search(
            r'<a class="cta"[^>]*href="https://welcometofrance.com"[^>]*>',
            html,
        )
        assert match, "Resources CTA anchor not found"
        assert 'target="_blank"' in match.group(0), "Resources CTA missing target=_blank"
        assert 'rel="noopener"' in match.group(0), "Resources CTA missing rel=noopener"

    def test_no_placeholder_marker(self, html):
        assert "Coming soon" not in html


# --------------------------------------------------------------------------
# External-content contract — site.json drives every page
# --------------------------------------------------------------------------


class TestSocialLinksOnEveryPage:
    """LinkedIn / Facebook / mailto links must render on every page."""

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_linkedin_link_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{LINKEDIN_URL}"' in resp.text, (
            f"{path}: LinkedIn URL missing"
        )

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_facebook_link_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{FACEBOOK_URL}"' in resp.text, (
            f"{path}: Facebook URL missing"
        )

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_mailto_link_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="mailto:{CONTACT_EMAIL}"' in resp.text, (
            f"{path}: mailto contact email missing"
        )


class TestMembershipFormCtaOnHomeAndMembers:
    """Google Form CTA URL must appear on `/` and `/members-benefits.html`."""

    @pytest.mark.parametrize("path", ["/", "/index.html", "/members-benefits.html"])
    def test_membership_form_url_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{MEMBERSHIP_FORM_URL}"' in resp.text, (
            f"{path}: membership form URL missing or not from site.json"
        )


# --------------------------------------------------------------------------
# Image pipeline — Astro <Image> emits responsive srcset, no large assets
# --------------------------------------------------------------------------


class TestImagePipeline:
    """Astro <Image> swap and 300KB-per-asset budget."""

    @pytest.mark.parametrize("path", ALL_PAGES)
    def test_hero_image_has_responsive_srcset(self, path):
        # M4 swaps the 2.4MB CSS-background hero for an Astro <Image>.
        # Every page renders the hero image with `class="hero-image"` and
        # responsive `srcset` widths.
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        match = re.search(r'<img[^>]*class="hero-image"[^>]*>', html)
        assert match, f"{path}: hero <img class='hero-image'> not found"
        tag = match.group(0)
        assert "srcset=" in tag, f"{path}: hero image missing srcset (Astro <Image> not wired)"
        assert "loading=\"eager\"" in tag, (
            f"{path}: hero image must use loading=eager so above-the-fold render isn't deferred"
        )
        assert "fetchpriority=\"high\"" in tag, (
            f"{path}: hero image must declare fetchpriority=high"
        )

    def test_about_board_images_use_astro_image(self):
        # M3/M4 moved board portraits onto the Astro Image pipeline.
        # The signature is webp variants in /_astro/ with `srcset`.
        resp = requests.get(f"{BASE_URL}/about.html", timeout=TIMEOUT)
        html = resp.text
        # 7 board cards × <Image> emits at least one webp.
        webp_imgs = re.findall(r'<img[^>]*src="/_astro/[^"]+\.webp"[^>]*>', html)
        assert len(webp_imgs) >= 7, (
            f"Expected at least 7 board <img> tags pointing at /_astro/*.webp "
            f"(Astro Image pipeline output), got {len(webp_imgs)}"
        )

    def test_partner_logos_use_astro_image_on_home(self):
        # Home grid renders 6 home-featured partners through PartnerCard,
        # which now uses Astro <Image>. Each emits a webp variant under
        # /_astro/.
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        html = resp.text
        # Locate partner-card blocks and confirm they reference _astro webp.
        partner_blocks = re.findall(
            r'<div class="partner"[^>]*data-testid="partner-card">(.*?)</div>\s*</div>',
            html,
            re.DOTALL,
        )
        assert len(partner_blocks) == 6, (
            f"Expected 6 home partner blocks, got {len(partner_blocks)}"
        )
        for block in partner_blocks:
            assert re.search(r'src="/_astro/[^"]+\.webp"', block), (
                "Partner logo not served from Astro Image pipeline"
            )

    def test_no_dist_image_exceeds_300kb(self):
        # Hard performance budget from the milestone spec — the legacy
        # site shipped a 2.4 MB hero and a 3.9 MB board photo. Build must
        # never emit any optimized asset over 300 KB.
        budget = 300 * 1024
        offenders = []
        astro_dir = os.path.join(DIST_DIR, "_astro")
        assert os.path.isdir(astro_dir), (
            f"dist/_astro/ does not exist — build never ran"
        )
        for entry in os.listdir(astro_dir):
            full = os.path.join(astro_dir, entry)
            if not os.path.isfile(full):
                continue
            ext = os.path.splitext(entry)[1].lower()
            if ext not in {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}:
                continue
            size = os.path.getsize(full)
            if size > budget:
                offenders.append((entry, size))
        assert not offenders, (
            "Image asset(s) in dist/_astro/ exceed the 300 KB budget: "
            + ", ".join(f"{n} ({s} bytes)" for n, s in offenders)
        )


# --------------------------------------------------------------------------
# Deployment artifacts in dist/
# --------------------------------------------------------------------------


class TestDeploymentArtifacts:
    """The static build must emit the exact files GitHub Pages needs."""

    REQUIRED_FILES = [
        "CNAME",
        "index.html",
        "about.html",
        "companies-sponsors.html",
        "events.html",
        "members-benefits.html",
        "resources.html",
        "sitemap-index.xml",
        "sitemap-0.xml",
    ]

    @pytest.mark.parametrize("filename", REQUIRED_FILES)
    def test_dist_contains_file(self, filename):
        path = os.path.join(DIST_DIR, filename)
        assert os.path.isfile(path), (
            f"dist/{filename} missing — build did not emit a required deployment artifact"
        )

    def test_cname_content(self):
        path = os.path.join(DIST_DIR, "CNAME")
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read().strip()
        assert content == "lafrenchtechdenver.com", (
            f"dist/CNAME content {content!r} does not match the production domain"
        )

    def test_cname_served_over_http(self):
        # Preview must serve the CNAME file verbatim — same as GitHub Pages will.
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        assert resp.status_code == 200, "GET /CNAME did not return 200"
        assert "lafrenchtechdenver.com" in resp.text, (
            "Served CNAME content does not contain the production domain"
        )


# --------------------------------------------------------------------------
# Sitemap correctness — .html suffix preserved across all six URLs
# --------------------------------------------------------------------------


class TestSitemap:
    """Sitemap must list every page with the .html suffix preserved."""

    def test_sitemap_index_responds_200(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /sitemap-index.xml -> {resp.status_code}"
        )

    def test_sitemap_index_references_sitemap_0(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        assert "https://lafrenchtechdenver.com/sitemap-0.xml" in resp.text, (
            "sitemap-index.xml does not reference /sitemap-0.xml"
        )

    @pytest.fixture(scope="class")
    def sitemap0(self):
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    @pytest.mark.parametrize("html_url", SITEMAP_HTML_URLS)
    def test_sitemap_lists_html_url(self, sitemap0, html_url):
        # The serialize() override in astro.config.mjs preserves the .html
        # suffix that build.format: 'file' produces. Losing it breaks
        # inbound search-engine links.
        assert f"<loc>{html_url}</loc>" in sitemap0, (
            f"sitemap-0.xml is missing canonical URL {html_url!r}"
        )

    def test_sitemap_does_not_emit_pretty_urls(self, sitemap0):
        bad_urls = [
            "<loc>https://lafrenchtechdenver.com/about</loc>",
            "<loc>https://lafrenchtechdenver.com/companies-sponsors</loc>",
            "<loc>https://lafrenchtechdenver.com/events</loc>",
            "<loc>https://lafrenchtechdenver.com/members-benefits</loc>",
            "<loc>https://lafrenchtechdenver.com/resources</loc>",
        ]
        for bad in bad_urls:
            assert bad not in sitemap0, (
                f"Sitemap emitted pretty URL {bad!r}; .html suffix dropped — "
                f"astro.config.mjs serialize() is broken"
            )


# --------------------------------------------------------------------------
# Contrast / a11y — primary-strong CSS token landed
# --------------------------------------------------------------------------


class TestContrastTokenLanded:
    """The WCAG AA contrast fix introduced --primary-strong used by .cta and .skip-link."""

    def test_primary_strong_token_defined_in_css(self):
        # The compiled CSS must define the new --primary-strong token.
        # Discover the about CSS file via the home page reference (Astro emits
        # a hashed name). Any page works.
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        match = re.search(r'href="(/_astro/[^"]+\.css)"', resp.text)
        assert match, "No /_astro/*.css link found on /index.html"
        css_path = match.group(1)
        css_resp = requests.get(f"{BASE_URL}{css_path}", timeout=TIMEOUT)
        assert css_resp.status_code == 200
        assert "--primary-strong" in css_resp.text, (
            "--primary-strong CSS token is not defined; "
            "WCAG AA contrast fix did not land"
        )

    def test_primary_strong_token_used_by_cta(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        match = re.search(r'href="(/_astro/[^"]+\.css)"', resp.text)
        assert match, "No /_astro/*.css link found on /index.html"
        css_path = match.group(1)
        css_resp = requests.get(f"{BASE_URL}{css_path}", timeout=TIMEOUT)
        css = css_resp.text
        # Look for either the .cta selector or .skip-link consuming the token.
        assert "--primary-strong" in css and (
            ".cta" in css and ".skip-link" in css
        ), ".cta or .skip-link selectors missing from compiled CSS"


# --------------------------------------------------------------------------
# Cross-page nav contract — every page's nav references all six pages
# --------------------------------------------------------------------------


class TestNavLinksOnEveryPage:
    """Every page's nav must include all six destinations."""

    NAV_LINKS = [
        "/index.html",
        "/about.html",
        "/companies-sponsors.html",
        "/events.html",
        "/members-benefits.html",
        "/resources.html",
    ]

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_nav_contains_all_links(self, page):
        resp = requests.get(f"{BASE_URL}{page}", timeout=TIMEOUT)
        assert resp.status_code == 200
        for link in self.NAV_LINKS:
            assert f'href="{link}"' in resp.text, (
                f"{page}: nav missing link to {link}"
            )

    @pytest.mark.parametrize("page", M4_PROMOTED_PAGES)
    def test_active_nav_link_matches_current_page(self, page):
        # The current-page link gets `class="active"` so users can see where
        # they are.
        resp = requests.get(f"{BASE_URL}{page}", timeout=TIMEOUT)
        # Match `<a href="<page>" class="active">` (Astro renders attributes
        # in source order).
        assert re.search(
            r'<a\s+href="' + re.escape(page) + r'"\s+class="active"',
            resp.text,
        ), f"{page}: current-page link does not have class=active"
