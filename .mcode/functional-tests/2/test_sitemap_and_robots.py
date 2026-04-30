"""Milestone 2 — Sitemap and robots.txt.

This milestone adds `@astrojs/sitemap` with a `serialize()` override that
re-appends `.html` to every URL so the sitemap stays in sync with the
legacy `build.format: 'file'` URL contract. It also adds a `public/robots.txt`
that points crawlers at the sitemap-index.

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# The XML namespace used by Sitemaps 0.9.
SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


@pytest.fixture(autouse=True)
def preview_server_up():
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestSitemapIndex:
    """`/sitemap-index.xml` must respond 200 with valid XML pointing at the
    per-page sitemap."""

    def test_status_200(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /sitemap-index.xml -> {resp.status_code}; "
            "sitemap integration is not emitting an index"
        )

    def test_content_type_xml(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        ctype = resp.headers.get("content-type", "")
        assert "xml" in ctype.lower(), (
            f"GET /sitemap-index.xml content-type was {ctype!r}; expected XML"
        )

    def test_well_formed_xml(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        # Will raise ParseError if the XML is malformed.
        root = ET.fromstring(resp.content)
        # A sitemap index has <sitemapindex> as its root with <sitemap> entries.
        assert root.tag.endswith("sitemapindex"), (
            f"sitemap-index.xml root tag was {root.tag!r}; expected sitemapindex"
        )
        children = list(root)
        assert len(children) >= 1, (
            "sitemap-index.xml should contain at least one <sitemap> entry"
        )

    def test_index_references_sitemap_0(self):
        resp = requests.get(f"{BASE_URL}/sitemap-index.xml", timeout=TIMEOUT)
        # The default @astrojs/sitemap output produces a single per-page file
        # named sitemap-0.xml.
        assert "sitemap-0.xml" in resp.text, (
            "sitemap-index.xml does not reference sitemap-0.xml"
        )


class TestSitemapZero:
    """`/sitemap-0.xml` must be valid XML where every <loc> ends in `.html`.
    This is the load-bearing assertion: the `serialize()` override in
    `astro.config.mjs` re-appends `.html` to keep the sitemap in sync with
    `build.format: 'file'`."""

    def test_status_200(self):
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        assert resp.status_code == 200

    def test_well_formed_xml(self):
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        root = ET.fromstring(resp.content)
        assert root.tag.endswith("urlset"), (
            f"sitemap-0.xml root tag was {root.tag!r}; expected urlset"
        )

    def test_every_loc_ends_with_html(self):
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        root = ET.fromstring(resp.content)
        urls = root.findall(f"{SITEMAP_NS}url")
        assert len(urls) >= 1, "sitemap-0.xml should list at least one URL"
        for url_el in urls:
            loc_el = url_el.find(f"{SITEMAP_NS}loc")
            assert loc_el is not None, "every <url> must contain a <loc>"
            loc = (loc_el.text or "").strip()
            assert loc.endswith(".html"), (
                f"sitemap entry {loc!r} does not end in '.html'; the "
                "serialize() override in astro.config.mjs is broken or missing"
            )

    def test_canonical_pages_present(self):
        """Each of the six canonical pages should appear in the sitemap."""
        resp = requests.get(f"{BASE_URL}/sitemap-0.xml", timeout=TIMEOUT)
        body = resp.text
        for page in [
            "index.html",
            "about.html",
            "companies-sponsors.html",
            "events.html",
            "members-benefits.html",
            "resources.html",
        ]:
            assert page in body, f"sitemap-0.xml is missing entry for {page}"


class TestRobotsTxt:
    """`/robots.txt` must respond 200 and reference the production sitemap-index."""

    def test_status_200(self):
        resp = requests.get(f"{BASE_URL}/robots.txt", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /robots.txt -> {resp.status_code}; "
            "public/robots.txt is missing or not being served"
        )

    def test_content_type_text(self):
        resp = requests.get(f"{BASE_URL}/robots.txt", timeout=TIMEOUT)
        ctype = resp.headers.get("content-type", "")
        # Most static servers serve robots.txt as text/plain.
        assert "text/plain" in ctype.lower() or "text" in ctype.lower(), (
            f"GET /robots.txt content-type was {ctype!r}; expected text/plain"
        )

    def test_references_sitemap_index(self):
        resp = requests.get(f"{BASE_URL}/robots.txt", timeout=TIMEOUT)
        body = resp.text
        # Spec requires the absolute production URL. Casing of the directive
        # name varies in the wild but the common form is "Sitemap:".
        assert re.search(
            r"^Sitemap:\s*https://lafrenchtechdenver\.com/sitemap-index\.xml\s*$",
            body,
            re.MULTILINE | re.IGNORECASE,
        ), (
            f"robots.txt does not reference the production sitemap-index URL. "
            f"Body: {body!r}"
        )

    def test_allows_all_user_agents(self):
        resp = requests.get(f"{BASE_URL}/robots.txt", timeout=TIMEOUT)
        body = resp.text
        # This is a public brochure site — there should be no `Disallow: /`.
        assert "User-agent: *" in body, "robots.txt should declare User-agent: *"
        assert not re.search(
            r"^\s*Disallow:\s*/\s*$", body, re.MULTILINE
        ), "robots.txt should not Disallow the entire site"
