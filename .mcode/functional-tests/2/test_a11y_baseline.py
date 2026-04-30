"""Milestone 2 — Accessibility baseline.

Asserts the structural a11y guarantees the milestone is supposed to deliver
on every one of the six pages:

- A `<a class="skip-link" href="#main-content">` is the first interactive
  element in <body>, BEFORE the <nav class="nav">. This both makes Tab-to-skip
  work and keeps the nav's outside-click handler from swallowing skip-link
  clicks.
- A `<main id="main-content">` landmark wraps the page content.
- The theme bootstrap is a synchronous inline `<script is:inline>` in <head>
  with no `defer`, `async`, or `type="module"` attributes — anything else
  reintroduces a flash of unstyled theme on reload.

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import re

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

PAGES = [
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
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


def _fetch(path: str) -> str:
    resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"GET {path} -> {resp.status_code}; cannot run a11y assertions"
    )
    return resp.text


class TestSkipLink:
    """The skip-link is the first interactive element in <body> on every page,
    placed BEFORE <nav class="nav"> so the nav's outside-click handler does
    not capture clicks meant for the skip-link."""

    @pytest.mark.parametrize("path", PAGES)
    def test_skip_link_present(self, path):
        html = _fetch(path)
        # Spec form is exactly `<a class="skip-link" href="#main-content">`.
        assert re.search(
            r'<a\s+class="skip-link"\s+href="#main-content"',
            html,
        ), (
            f'Page {path} is missing <a class="skip-link" href="#main-content">; '
            "keyboard skip-to-content is broken"
        )

    @pytest.mark.parametrize("path", PAGES)
    def test_skip_link_dom_precedes_nav(self, path):
        html = _fetch(path)
        skip_match = re.search(r'<a\s+class="skip-link"', html)
        nav_match = re.search(r'<nav\s+class="nav"|<header\s+class="nav"', html)
        assert skip_match is not None, (
            f"Page {path} has no skip-link to anchor the DOM-order check"
        )
        # The nav landmark in this site is rendered as <header class="nav">
        # (see Nav.astro). We accept either form so the test stays robust if
        # the wrapping tag changes but the contract remains.
        assert nav_match is not None, (
            f"Page {path} has no <nav class='nav'> / <header class='nav'> "
            "landmark to anchor the DOM-order check"
        )
        assert skip_match.start() < nav_match.start(), (
            f"Page {path}: skip-link must appear in the DOM BEFORE the nav. "
            "Otherwise the nav's outside-click handler can capture the click."
        )


class TestMainLandmark:
    """`<main id="main-content">` must exist on every page so the skip-link
    target resolves, screen readers expose the landmark, and the document has
    a single primary content region."""

    @pytest.mark.parametrize("path", PAGES)
    def test_main_landmark_present(self, path):
        html = _fetch(path)
        # Allow other attributes between <main and id="main-content".
        assert re.search(
            r'<main[^>]*\sid="main-content"',
            html,
        ), (
            f'Page {path} is missing <main id="main-content">; '
            "skip-link target and primary landmark are broken"
        )


class TestThemeBootstrap:
    """The theme bootstrap MUST stay a synchronous inline <script is:inline>
    inside <head>. `defer`, `async`, or `type="module"` would all delay
    execution until after first paint and reintroduce the flash-of-unstyled-
    theme that the inline script exists to prevent."""

    @pytest.mark.parametrize("path", PAGES)
    def test_bootstrap_inline_in_head(self, path):
        html = _fetch(path)
        head_match = re.search(r"<head\b[^>]*>(.*?)</head>", html, re.DOTALL | re.IGNORECASE)
        assert head_match, f"Page {path} has no <head>...</head> section"
        head = head_match.group(1)
        # The bootstrap reads localStorage.theme and writes data-theme. Both
        # markers must live inside <head> for the no-FOUC guarantee.
        assert "localStorage.getItem('theme')" in head or 'localStorage.getItem("theme")' in head, (
            f"Page {path}: theme bootstrap is not inside <head>; "
            "moving it out reintroduces the flash of unstyled theme"
        )
        assert "setAttribute('data-theme'" in head or 'setAttribute("data-theme"' in head, (
            f"Page {path}: data-theme assignment is not inside <head>; "
            "first paint will use the wrong theme"
        )

    @pytest.mark.parametrize("path", PAGES)
    def test_bootstrap_script_is_synchronous(self, path):
        html = _fetch(path)
        # Find every <script ...> tag whose body mentions the localStorage
        # bootstrap and assert none of them are deferred / async / module.
        # We scan the full HTML to be extra-safe against attribute-order
        # variations.
        script_re = re.compile(
            r"<script\b([^>]*)>(.*?)</script>", re.DOTALL | re.IGNORECASE
        )
        found_bootstrap = False
        for m in script_re.finditer(html):
            attrs = m.group(1) or ""
            body = m.group(2) or ""
            if (
                "localStorage.getItem('theme')" in body
                or 'localStorage.getItem("theme")' in body
            ) and "data-theme" in body:
                found_bootstrap = True
                # No defer / async / type=module — those would delay execution
                # until after first paint.
                assert not re.search(r"\bdefer\b", attrs, re.IGNORECASE), (
                    f"Page {path}: theme bootstrap <script> has `defer` "
                    f"(attrs={attrs!r}); FOUC will return"
                )
                assert not re.search(r"\basync\b", attrs, re.IGNORECASE), (
                    f"Page {path}: theme bootstrap <script> has `async` "
                    f"(attrs={attrs!r}); FOUC will return"
                )
                assert not re.search(
                    r'type\s*=\s*["\']?module', attrs, re.IGNORECASE
                ), (
                    f"Page {path}: theme bootstrap <script> has "
                    f'`type="module"` (attrs={attrs!r}); module scripts are '
                    "deferred by default and FOUC will return"
                )
        assert found_bootstrap, (
            f"Page {path}: no <script> with the localStorage theme bootstrap "
            "was found at all; the no-FOUC guarantee is gone"
        )
