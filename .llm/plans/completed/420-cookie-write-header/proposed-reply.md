A state-changing request that is signed in through the session cookie now has to send
the X-Podverse-Request-Intent header. Browser form posts from another site do not send
that header. Sign-in with a bearer token or an API key is unchanged, and mobile is
unchanged. Deploy the API and the web app together so cookie writes keep working.
