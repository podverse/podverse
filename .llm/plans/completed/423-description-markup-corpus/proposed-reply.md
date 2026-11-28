Feed descriptions are still stored through the same allowlist. The tests now cover more
hostile markup, including event-handler attributes, unexpected tags, and link schemes
other than http, https, and mailto. A description that does not pass is stored without
that markup.
