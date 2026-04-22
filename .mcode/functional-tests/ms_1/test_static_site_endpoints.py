"""Functional tests for the Milestone 1 Astro static site.

The site has no runtime backend — these tests drive the built output through
the `pnpm preview` server (same one used by lifecycle `run` + Playwright).
They assert that every legacy .html URL resolves 200 and that the home page
contains the expected Milestone 1 content: hero heading, Google Form CTA,
KPIs, and the six nav links that future milestones depend on.

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# The six URLs the legacy site exposed. `build.format: 'file'` in
# astro.config.mjs is load-bearing — any of these dropping to 404 is a
# public-contract break.
LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# Relative-path hrefs that the shared Nav renders on every page. Each one
# must appear in the served HTML or the nav is broken.
NAV_HREFS = [
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/members-benefits.html",
    "/events.html",
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


class TestLegacyUrlPreservation:
    """Every legacy .html URL must resolve 200."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_url_responds_200(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET {path} -> {resp.status_code}; URL preservation contract broken"
        )
        assert "text/html" in resp.headers.get("content-type", ""), (
            f"GET {path} did not return HTML content-type: "
            f"{resp.headers.get('content-type')!r}"
        )


class TestHomePageContent:
    """The home page ships real content: hero, CTA, KPIs, partners."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_hero_heading(self, html):
        # The hero <h1> is the signature element of the home page.
        assert "La French Tech Denver" in html

    def test_hero_subheading(self, html):
        assert "Your tech rendez-vous with a French touch and mountain views" in html

    def test_membership_cta_present(self, html):
        # Google Form CTA wired to the production membership form.
        assert (
            "docs.google.com/forms/d/1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM"
            in html
        )
        assert "Become a Member" in html

    @pytest.mark.parametrize(
        "kpi_number,kpi_label",
        [
            ("13", "Companies"),
            ("262", "People"),
            ("5", "Nationalities"),
            ("33%", "Women"),
        ],
    )
    def test_kpi_card(self, html, kpi_number, kpi_label):
        assert kpi_number in html, f"KPI number {kpi_number!r} missing"
        assert kpi_label in html, f"KPI label {kpi_label!r} missing"

    @pytest.mark.parametrize(
        "partner_name",
        [
            "Superteam",
            "Modelcode.ai",
            "Mad Science of Colorado",
            "Ridiculous Engineering",
            "Einride",
            "Extern",
        ],
    )
    def test_partner_card(self, html, partner_name):
        assert partner_name in html, f"Partner {partner_name!r} missing from home page"


class TestSharedLayout:
    """BaseLayout elements must render on every page."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_nav_contains_all_links(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        html = resp.text
        for href in NAV_HREFS:
            assert f'href="{href}"' in html, (
                f"Nav on {path} is missing link to {href}"
            )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_social_links_on_every_page(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "linkedin.com/company/denver-french-tech" in html
        assert "facebook.com/groups/lafrenchtechdenver" in html
        assert "mailto:contact@lafrenchtechdenver.com" in html

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_footer_copyright_on_every_page(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "La French Tech Denver" in html
        assert "Community-run in Denver, CO" in html

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_theme_bootstrap_is_inline(self, path):
        """The theme bootstrap must be inline in <head> to avoid FOUC."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # The bootstrap reads localStorage.theme and sets data-theme before paint.
        assert "localStorage.getItem('theme')" in html
        assert "setAttribute('data-theme'" in html
