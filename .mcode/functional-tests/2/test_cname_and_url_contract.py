"""Functional tests verifying Milestone 2 did not break the legacy URL contract.

Milestone 2 adds new artifacts (sitemap, robots.txt, a11y baseline). It must
not regress the URL preservation contract from Milestone 1:

  - The six legacy .html URLs all serve 200 with text/html
  - /CNAME serves verbatim ("lafrenchtechdenver.com\\n")
  - / and /index.html return the same hero content (the home page)

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# Six legacy URLs preserved across the modernization.
LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# Page-specific content: each page must contain at least one
# unmistakably-page-specific string so we know the right page is being served
# (not a 200 from some catch-all).
PAGE_FINGERPRINTS = {
    "/index.html": "Your tech rendez-vous with a French touch and mountain views",
    "/about.html": "About",
    "/companies-sponsors.html": "Companies",
    "/events.html": "Events",
    "/members-benefits.html": "Members",
    "/resources.html": "Resources",
}


@pytest.fixture(autouse=True)
def preview_server_up():
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestLegacyUrlPreservation:
    """Each legacy .html URL still resolves to 200 + text/html."""

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

    @pytest.mark.parametrize("path,fingerprint", list(PAGE_FINGERPRINTS.items()))
    def test_page_specific_content(self, path, fingerprint):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert fingerprint in resp.text, (
            f"GET {path} returned 200 but did not contain page-specific "
            f"fingerprint {fingerprint!r}"
        )

    def test_root_and_index_html_render_home(self):
        # `/` and `/index.html` both serve the home page hero subhead.
        for path in ("/", "/index.html"):
            resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
            assert resp.status_code == 200
            assert (
                "Your tech rendez-vous with a French touch and mountain views"
                in resp.text
            ), f"{path} did not return the home page hero copy"


class TestCnameContract:
    """`public/CNAME` must be served verbatim by `pnpm preview`."""

    def test_cname_responds_200(self):
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /CNAME -> {resp.status_code}; GitHub Pages depends on this file"
        )

    def test_cname_body_is_apex_domain(self):
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        # The CNAME file binds the GitHub Pages site to lafrenchtechdenver.com.
        # Whitespace tolerance: trailing newline is fine, but the only payload
        # must be the apex domain.
        body = resp.text.strip()
        assert body == "lafrenchtechdenver.com", (
            f"/CNAME body was {body!r}, expected exactly 'lafrenchtechdenver.com'"
        )
