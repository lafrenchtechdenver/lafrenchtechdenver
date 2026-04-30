"""Functional tests for Milestone 3 — Content Collections & Data-Driven UI.

Milestone 3 moves board members, partners, KPIs, and global site URLs out of
inline HTML into Astro Content Collections (`src/content/{board,partners,
kpis,site}/`). This pytest suite is the HTTP-level safety net for that
migration: it asserts that the rendered `dist/` HTML actually contains the
data the collections promise.

These tests are HTTP-only — frontend interaction (filtering, theme toggle,
mobile menu) is covered by Playwright in `tests/`. The shared chrome and URL
contract are covered by the Milestone 1 / Milestone 2 suites; this file
focuses on what M3 newly added or refactored.

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import re

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# All six legacy URLs — any of them must continue to render the social block
# (which is now read from `src/content/site/social.json`).
LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# The 4 KPIs authored under `src/content/kpis/*.json`. Tuple (value, label,
# order). Sorted by `order` so list position is deterministic and matches the
# visual order driven by `index.astro`.
EXPECTED_KPIS = [
    ("13", "Companies", 1),
    ("262", "People", 2),
    ("5", "Nationalities", 3),
    ("33%", "Women", 4),
]

# Home-featured partners from `src/content/partners/*.md` with
# `featuredOn: ['home']`. Six entries.
EXPECTED_HOME_PARTNERS = [
    ("Superteam", "Marketing & Events", "https://superteam.ca"),
    ("Modelcode.ai", "Software & AI", "https://modelcode.ai"),
    ("Mad Science of Colorado", "STEM Education", "https://colorado.madscience.org"),
    ("Ridiculous Engineering", "Engineering & Operations", "https://ridiculousengineering.com"),
    ("Einride", "Autonomous Tech", "https://einride.tech"),
    ("Extern", "Customer Success", "https://www.extern.com"),
]

# Sponsor-only partners — they must NOT bleed onto the home page.
SPONSOR_ONLY_PARTNERS = ["Techstars", "Finmark"]

# Board members in the order produced by `getCollection('board')` sorted by
# the frontmatter `order` field.
EXPECTED_BOARD_MEMBERS_ORDERED = [
    ("Ben Bouteille", "President — Head of Marketing & Event at Superteam", 1),
    (
        "Baptiste Le Poittevin",
        "Vice President — Commercial Director, Autonomous Technology at Einride",
        2,
    ),
    (
        "Patrizia Marzialli",
        "Board Member — COO & Founding Partner, Ridiculous Engineering",
        3,
    ),
    (
        "Sandrine Vohra",
        "Board Member — Multicultural Marketing Consultant & Business Advisor",
        4,
    ),
    ("Arthur Rio", "Board Member — Software Engineer at Modelcode AI", 5),
    ("Clémence Viot", "Board Member — CEO & Owner at Mad Science of Colorado", 6),
    (
        "Elina Hakobyan Roetynck",
        "Board Member — Director of Operations | Customer Success at Extern",
        7,
    ),
]


# Values that come from `src/content/site/social.json` — every page renders
# them via `SocialLinks.astro` (`getEntry('site', 'social')`).
SITE_SOCIAL_LINKEDIN = "https://www.linkedin.com/company/denver-french-tech"
SITE_SOCIAL_FACEBOOK = "https://www.facebook.com/groups/lafrenchtechdenver/"
SITE_SOCIAL_EMAIL = "contact@lafrenchtechdenver.com"
SITE_MEMBERSHIP_FORM = (
    "https://docs.google.com/forms/d/"
    "1tpHwjsberWYWbVuiEy9S6CP44k0gxJuaFi9ha5QBIqM/viewform"
)

# Sitemap continues to emit the .html-suffixed URLs after the M3 refactor —
# this is the URL preservation contract from Milestone 2 and must not regress.
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
# KPI cards driven by the `kpis` data collection
# --------------------------------------------------------------------------


class TestHomeKpiCards:
    """`src/content/kpis/*.json` -> 4 `.card.kpi` blocks on `/`."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_exactly_four_kpi_cards_render(self, html):
        # `data-testid="kpi-card"` is added by `KpiCard.astro` and is the
        # stable test contract for the kpi cards.
        cards = re.findall(r'data-testid="kpi-card"', html)
        assert len(cards) == 4, (
            f"Expected exactly 4 kpi cards, got {len(cards)}. "
            f"Did a kpi JSON file get deleted / renamed?"
        )

    @pytest.mark.parametrize("value,label,_order", EXPECTED_KPIS)
    def test_kpi_card_value_and_label(self, html, value, label, _order):
        # The KpiCard markup is `<div class="num">{value}</div>` followed by
        # `<div class="label">{label}</div>`. We assert the full pair is
        # present in DOM order so a value/label mismatch is still caught.
        pattern = (
            rf'<div class="num">{re.escape(value)}</div>\s*'
            rf'<div class="label">{re.escape(label)}</div>'
        )
        assert re.search(pattern, html), (
            f"KPI ({value!r}, {label!r}) not rendered in expected pair on /index.html"
        )

    def test_kpi_cards_are_sorted_by_order(self, html):
        # The four cards must appear in `order` 1..4 (Companies, People,
        # Nationalities, Women). Filesystem iteration is non-deterministic
        # across OSes, so this catches a missing `.sort(...)` call.
        positions = []
        for value, _label, _order in EXPECTED_KPIS:
            idx = html.find(f'<div class="num">{value}</div>')
            assert idx != -1, f"KPI value {value!r} missing"
            positions.append(idx)
        assert positions == sorted(positions), (
            "KPIs are not rendered in the order field's order; sort by `order` is broken"
        )


# --------------------------------------------------------------------------
# Partner cards on the home page
# --------------------------------------------------------------------------


class TestHomePartnerCards:
    """`src/content/partners/*.md` filtered by `featuredOn: ['home']` -> 6 cards on `/`."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_exactly_six_partner_cards_render(self, html):
        cards = re.findall(r'data-testid="partner-card"', html)
        assert len(cards) == 6, (
            f"Expected exactly 6 home-featured partner cards, got {len(cards)}. "
            f"Check `featuredOn` arrays in src/content/partners/*.md"
        )

    @pytest.mark.parametrize("name,tagline,url", EXPECTED_HOME_PARTNERS)
    def test_partner_name_tagline_url_render(self, html, name, tagline, url):
        # All three fields are rendered by `PartnerCard.astro`.
        # Use `&amp;` for `&` since it's HTML-encoded by Astro.
        encoded_name = name.replace("&", "&amp;")
        encoded_tagline = tagline.replace("&", "&amp;")
        assert f"<h4>{encoded_name}</h4>" in html, (
            f"Partner {name!r} <h4> not present"
        )
        assert f'<div class="note">{encoded_tagline}</div>' in html, (
            f"Partner tagline {tagline!r} not rendered for {name}"
        )
        assert f'href="{url}"' in html, (
            f"Partner URL {url!r} not rendered for {name}"
        )

    @pytest.mark.parametrize("name,_tagline,_url", EXPECTED_HOME_PARTNERS)
    def test_partner_link_has_blank_target_and_noopener(
        self, html, name, _tagline, _url
    ):
        # The legacy contract is `target="_blank" rel="noopener"`.
        # Locate the <a> wrapping this partner's <h4> and assert attributes.
        encoded_name = name.replace("&", "&amp;")
        idx = html.find(f"<h4>{encoded_name}</h4>")
        assert idx != -1, f"Partner {name!r} marker not found"
        anchor_open = html.rfind("<a ", 0, idx)
        assert anchor_open != -1, f"Partner {name!r} not wrapped in <a>"
        anchor_chunk = html[anchor_open : idx + 1]
        assert 'target="_blank"' in anchor_chunk, (
            f"Partner {name!r} <a> missing target=_blank"
        )
        assert 'rel="noopener"' in anchor_chunk, (
            f"Partner {name!r} <a> missing rel=noopener"
        )

    @pytest.mark.parametrize("name", SPONSOR_ONLY_PARTNERS)
    def test_sponsor_only_partners_not_on_home(self, html, name):
        # `Techstars` and `Finmark` are flagged `featuredOn: ['sponsors']` —
        # the home page filter must exclude them.
        partner_block = re.search(
            r'<div class="partner"[^>]*data-testid="partner-card">(.*?)</a>',
            html,
            re.DOTALL,
        )
        # We don't assert on the block; we just walk every partner-card body
        # and assert none of them contain the sponsor-only names.
        partners = re.findall(
            r'data-testid="partner-card">(.*?)</div>\s*</div>',
            html,
            re.DOTALL,
        )
        for body in partners:
            assert name not in body, (
                f"Sponsor-only partner {name!r} leaked onto home page partner grid"
            )


# --------------------------------------------------------------------------
# About page (rebuilt from placeholder)
# --------------------------------------------------------------------------


class TestAboutPageContent:
    """`/about.html` is no longer a placeholder — it renders mission/values + 7 board cards."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/about.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_hero_heading(self, html):
        # The new About hero <h1>.
        assert "<h1>About La French Tech Denver</h1>" in html, (
            "About page hero h1 missing — page may still be the M1 placeholder"
        )

    def test_hero_description_present(self, html):
        assert (
            "curated support community helping entrepreneurs thrive" in html
        ), "About page hero description missing"

    def test_mission_card_renders(self, html):
        assert "<h2>Our Mission</h2>" in html, "Mission card heading missing"
        assert "Bring French entrepreneurs together" in html, (
            "Mission card body copy missing"
        )

    def test_mission_goals_list_renders(self, html):
        for goal in [
            "Support existing French startups in Colorado",
            "Grow an ecosystem where anyone can build in the Rockies",
            "Bridge the local tech scene with French founders and talent",
        ]:
            assert goal in html, f"Mission goal item {goal!r} missing"

    def test_values_card_renders(self, html):
        assert "<h2>Our Values</h2>" in html, "Values card heading missing"
        # The three values use em-dashes which are HTML-encoded in the rendered
        # output (`&amp;` for `&`). Check the literal characters used in the
        # rendered HTML.
        for value in [
            "Collaboration — Support &amp; Accelerate",
            "Innovation — Empower &amp; Federate",
            "Entrepreneurship — Inspire &amp; Shine",
        ]:
            assert value in html, f"Values item {value!r} missing"

    def test_meet_the_board_section_present(self, html):
        # Heading + container.
        assert "<h2>Meet the Board</h2>" in html, "Meet the Board heading missing"
        assert '<div class="board">' in html, ".board grid container missing"

    def test_about_is_no_longer_placeholder(self, html):
        # The Milestone 1 placeholder file used the literal "Coming soon"
        # marker. Make sure that exact phrase is gone from /about.html.
        assert "Coming soon" not in html, (
            "About page still contains 'Coming soon' — placeholder not replaced"
        )


class TestAboutBoardCards:
    """`getCollection('board')` -> 7 BoardCard components on `/about.html`."""

    @pytest.fixture(scope="class")
    def html(self):
        resp = requests.get(f"{BASE_URL}/about.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_exactly_seven_board_cards(self, html):
        cards = re.findall(r'data-testid="board-card"', html)
        assert len(cards) == 7, (
            f"Expected exactly 7 board cards, got {len(cards)}. "
            f"Check src/content/board/*.md"
        )

    @pytest.mark.parametrize(
        "name,role,_order", EXPECTED_BOARD_MEMBERS_ORDERED
    )
    def test_board_member_name_and_role(self, html, name, role, _order):
        # The BoardCard renders `<h4>{name}</h4>` and `<div class="note">{role}</div>`.
        # `&` becomes `&amp;` and `|` is preserved; otherwise the strings are literal.
        encoded_name = name.replace("&", "&amp;")
        encoded_role = role.replace("&", "&amp;")
        assert f"<h4>{encoded_name}</h4>" in html, (
            f"Board <h4>{name}</h4> not rendered"
        )
        assert f'<div class="note">{encoded_role}</div>' in html, (
            f"Board role for {name!r} not rendered: {role!r}"
        )

    def test_board_cards_in_order_field_order(self, html):
        # Cards must render in `order` 1..7. Walk by the `<h4>` markers and
        # confirm the position of each name increases monotonically.
        positions = []
        for name, _role, _order in EXPECTED_BOARD_MEMBERS_ORDERED:
            encoded_name = name.replace("&", "&amp;")
            idx = html.find(f"<h4>{encoded_name}</h4>")
            assert idx != -1, f"Board card for {name!r} missing"
            positions.append(idx)
        assert positions == sorted(positions), (
            f"Board cards rendered out of `order` sequence: positions={positions}"
        )

    def test_board_card_has_grayscale_class_when_flagged(self, html):
        # Every board entry has `grayscale: true` in this milestone, so the
        # `.is-grayscale` class must appear on every `.card.person` block.
        # The legacy `style="filter: grayscale(100%)"` attribute MUST be gone.
        person_blocks = re.findall(
            r'<div class="card person[^"]*"[^>]*data-testid="board-card">',
            html,
        )
        assert len(person_blocks) == 7, (
            f"Expected 7 .card.person blocks, got {len(person_blocks)}"
        )
        for block in person_blocks:
            assert "is-grayscale" in block, (
                f"BoardCard {block!r} missing `is-grayscale` class"
            )
        # No inline filter style anywhere on the page.
        assert "filter: grayscale" not in html, (
            "Inline `filter: grayscale` style still present — should be a CSS class"
        )
        assert "filter:grayscale" not in html, (
            "Inline `filter:grayscale` style still present — should be a CSS class"
        )

    @pytest.mark.parametrize(
        "name,_role,_order", EXPECTED_BOARD_MEMBERS_ORDERED
    )
    def test_board_card_image_alt_matches_name(self, html, name, _role, _order):
        # The BoardCard sets `alt={name}` on the <img>. This is the only
        # accessible label for the photo; a typo here is the kind of
        # regression a contributor PR can introduce.
        assert f'alt="{name}"' in html, (
            f"Board card image for {name!r} missing alt='{name}'"
        )


# --------------------------------------------------------------------------
# `site` data collection — social URLs and CTA URL
# --------------------------------------------------------------------------


class TestSiteCollectionDrivesSocialLinks:
    """`SocialLinks.astro` reads URLs from `src/content/site/social.json`."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_linkedin_url_from_site_collection(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{SITE_SOCIAL_LINKEDIN}"' in resp.text, (
            f"{path}: LinkedIn URL from site.json missing"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_facebook_url_from_site_collection(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{SITE_SOCIAL_FACEBOOK}"' in resp.text, (
            f"{path}: Facebook URL from site.json missing"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_mailto_url_from_site_collection(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="mailto:{SITE_SOCIAL_EMAIL}"' in resp.text, (
            f"{path}: mailto URL built from site.json missing"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_aria_labels_render(self, path):
        # `SocialLinks.astro` provides `aria-label` for each link.
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        for label in ('aria-label="LinkedIn"', 'aria-label="Facebook"', 'aria-label="Email"'):
            assert label in resp.text, f"{path}: SocialLinks {label} missing"


class TestSiteCollectionDrivesMembershipFormCta:
    """`index.astro` reads `membershipFormUrl` from `getEntry('site', 'social')`."""

    def test_cta_url_renders_from_site_collection(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert f'href="{SITE_MEMBERSHIP_FORM}"' in resp.text, (
            "Membership form CTA URL not pulled from site.json"
        )

    def test_cta_anchor_attributes(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        # The CTA must be `target=_blank rel=noopener` per the existing contract.
        match = re.search(
            r'<a class="cta"[^>]*>\s*Become a Member\s*</a>',
            resp.text,
        )
        assert match, "CTA anchor with 'Become a Member' label not found"
        assert 'target="_blank"' in match.group(0), (
            "CTA anchor missing target=_blank"
        )
        assert 'rel="noopener"' in match.group(0), "CTA anchor missing rel=noopener"


# --------------------------------------------------------------------------
# Sitemap regression — the M3 refactor must not drop the .html suffix
# --------------------------------------------------------------------------


class TestSitemapStillEmitsHtmlUrls:
    """`/sitemap-0.xml` continues to emit canonical .html URLs after M3 refactor."""

    @pytest.fixture(scope="class")
    def body(self):
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    @pytest.mark.parametrize("html_url", SITEMAP_HTML_URLS)
    def test_sitemap_lists_html_url(self, body, html_url):
        assert f"<loc>{html_url}</loc>" in body, (
            f"Sitemap missing canonical .html URL {html_url!r} after M3 refactor"
        )
