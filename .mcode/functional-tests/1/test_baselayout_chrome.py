"""Foundation milestone: BaseLayout chrome tests.

`BaseLayout.astro` is the single source of truth for every page in this
milestone. Every legacy URL, when served, must include:

  - A <title> tag with site name
  - The skip-to-content anchor as the first child of <body>
  - <main id="main-content"> landmark
  - The shared Nav (six legacy nav links + theme toggle + social block + burger)
  - The shared Footer with the copyright line
  - The inline theme bootstrap script in <head>

Run against the preview server brought up by lifecycle `run`
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

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
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestSharedNav:
    """The shared Nav appears on every page with all six legacy links."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_all_nav_links_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        html = resp.text
        for href in NAV_HREFS:
            assert f'href="{href}"' in html, (
                f"Nav on {path} is missing link to {href}"
            )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_burger_button_present(self, path):
        """Mobile burger button must be present on every page."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'id="burger-button"' in html, (
            f"Nav on {path} is missing the burger button"
        )
        assert 'aria-controls="menu"' in html, (
            f"Nav on {path} burger missing aria-controls"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_theme_toggle_present(self, path):
        """Theme toggle button must be present on every page."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'id="theme-toggle"' in html, (
            f"Theme toggle missing on {path}"
        )


class TestSharedFooter:
    """The shared Footer copyright line appears on every page."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_footer_copyright_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "La French Tech Denver" in html
        assert "Community-run in Denver, CO" in html, (
            f"Footer copyright line missing on {path}"
        )


class TestSocialLinks:
    """Social block appears on every page with LinkedIn, Facebook, mailto."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_social_links_present(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "linkedin.com/company/denver-french-tech" in html, (
            f"LinkedIn social link missing on {path}"
        )
        assert "facebook.com/groups/lafrenchtechdenver" in html, (
            f"Facebook social link missing on {path}"
        )
        assert "mailto:contact@lafrenchtechdenver.com" in html, (
            f"Mailto social link missing on {path}"
        )


class TestThemeBootstrap:
    """The inline <script is:inline> theme bootstrap must run before paint."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_theme_bootstrap_inline(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        # The bootstrap reads localStorage.theme and sets data-theme before paint.
        assert "localStorage.getItem('theme')" in html, (
            f"Theme bootstrap missing on {path}"
        )
        assert "setAttribute('data-theme'" in html, (
            f"Theme bootstrap missing data-theme assignment on {path}"
        )


class TestAccessibilityLandmarks:
    """Skip link and main landmark must be present (BaseLayout chrome)."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_to_content_link(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'href="#main-content"' in html, (
            f"Skip-to-content anchor missing on {path}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_main_landmark(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'id="main-content"' in html, (
            f"<main id=\"main-content\"> landmark missing on {path}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_html_lang_attribute(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert '<html lang="en">' in html, (
            f"<html lang=\"en\"> missing on {path}"
        )


class TestPageMetadata:
    """Every page must have a <title> and meta description."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_has_title_tag(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert "<title>" in html and "</title>" in html, (
            f"Page {path} missing <title> tag"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_has_meta_description(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'name="description"' in html, (
            f"Page {path} missing meta description"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_has_og_tags(self, path):
        """Open Graph tags must be present for social sharing."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'property="og:title"' in html, (
            f"og:title missing on {path}"
        )
        assert 'property="og:image"' in html, (
            f"og:image missing on {path}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_has_charset_and_viewport(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        assert 'charset="utf-8"' in html or 'charset=utf-8' in html, (
            f"charset meta missing on {path}"
        )
        assert 'name="viewport"' in html, (
            f"viewport meta missing on {path}"
        )
