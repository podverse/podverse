Server fetches of URLs that come from people, feeds, or other outside parties now use one
check. The connection stays on an address that check already accepted, and a redirect is
checked the same way. Fetches of this deployment's own API are unchanged. An image or feed
URL that pointed at a private address no longer loads through the server.
