"""Foundation milestone: Home page content tests.

The home page (`/`, `/index.html`) is the only page in M1 with full content
wired (the other five pages are placeholders in M1; later milestones replace
them with real content).

The home page must include:
  - Hero <h1> with the site name
  - Hero subhead with the rendez-vous tagline
  - 4 KPI cards
  - Friends & Partners section
  - "Become a Member" Google Form CTA

Run against the preview server brought up by lifecycle `run`
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10


@pytest.fixture(autouse=True)
def preview_server_up():
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


@pytest.fixture(scope="module")
def home_html():
    resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
    assert resp.status_code == 200
    return resp.text


class TestHero:
    """Home hero: heading + subheading must be present."""

    def test_hero_heading(self, home_html):
        assert "La French Tech Denver" in home_html, (
            "Hero heading missing — home page is unrecognizable"
        )

    def test_hero_subheading(self, home_html):
        assert (
            "Your tech rendez-vous with a French touch and mountain views"
            in home_html
        ), "Hero subhead is missing on the home page"


class TestKPIs:
    """The four KPI cards on the home page (companies, people, etc.)."""

    @pytest.mark.parametrize(
        "kpi_number,kpi_label",
        [
            ("13", "Companies"),
            ("262", "People"),
            ("5", "Nationalities"),
            ("33%", "Women"),
        ],
    )
    def test_kpi_card(self, home_html, kpi_number, kpi_label):
        assert kpi_number in home_html, f"KPI number {kpi_number!r} missing"
        assert kpi_label in home_html, f"KPI label {kpi_label!r} missing"


class TestPartners:
    """The six Friends & Partners cards on the home page."""

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
    def test_partner_card(self, home_html, partner_name):
        assert partner_name in home_html, (
            f"Partner {partner_name!r} missing from home page"
        )


class TestMembershipCTA:
    """The Google Form CTA wired to the production membership form."""

    def test_cta_button_text(self, home_html):
        assert "Become a Member" in home_html, (
            "Become a Member CTA text missing"
        )

    def test_cta_links_to_google_form(self, home_html):
        # The legacy form URL is hard-coded in M1; M3 moves it to the site collection.
        assert (
            "docs.google.com/forms/d/1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM"
            in home_html
        ), "Google Form CTA URL is missing or has changed"
