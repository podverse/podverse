Session tokens are now signed and checked only as HMAC-SHA256. A token that names
another method is rejected. Tokens the API already issues still verify.
