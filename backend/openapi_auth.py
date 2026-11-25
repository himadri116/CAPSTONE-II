def add_auth_operations(schema: dict, auth_api_url: str) -> dict:
    auth_server = [
        {
            "url": auth_api_url,
            "description": "Express authentication service",
        }
    ]
    components = schema.setdefault("components", {}).setdefault("schemas", {})
    components.update(
        {
            "AuthUser": {
                "type": "object",
                "required": ["id", "name", "email", "authProvider"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "email": {"type": "string", "format": "email"},
                    "avatar": {"type": "string", "format": "uri", "nullable": True},
                    "authProvider": {"type": "string", "enum": ["local", "google"]},
                },
            },
            "AuthResponse": {
                "type": "object",
                "required": ["token", "user"],
                "properties": {
                    "token": {
                        "type": "string",
                        "description": "JWT to use as the Bearer token on protected scanner operations.",
                    },
                    "user": {"$ref": "#/components/schemas/AuthUser"},
                },
            },
            "AuthMessage": {
                "type": "object",
                "required": ["message"],
                "properties": {"message": {"type": "string"}},
            },
            "AuthError": {
                "type": "object",
                "required": ["message"],
                "properties": {"message": {"type": "string"}},
            },
        }
    )

    def body(schema_value: dict) -> dict:
        return {
            "required": True,
            "content": {"application/json": {"schema": schema_value}},
        }

    def response(description: str, schema_ref: str) -> dict:
        return {
            "description": description,
            "content": {"application/json": {"schema": {"$ref": schema_ref}}},
        }

    auth_error = "#/components/schemas/AuthError"
    auth_response = "#/components/schemas/AuthResponse"
    auth_message = "#/components/schemas/AuthMessage"
    password = {
        "type": "string",
        "format": "password",
        "minLength": 8,
    }

    schema["paths"]["/api/auth/register"] = {
        "servers": auth_server,
        "post": {
            "tags": ["Authentication"],
            "summary": "Register with email and password",
            "description": "Passwords must be at least 8 characters. Returns the shared API JWT.",
            "operationId": "registerAccount",
            "requestBody": body(
                {
                    "type": "object",
                    "required": ["name", "email", "password"],
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string", "format": "email"},
                        "password": password,
                    },
                }
            ),
            "responses": {
                "201": response("Account created.", auth_response),
                "400": response("Invalid registration details.", auth_error),
                "409": response("Email is already registered.", auth_error),
                "429": response("Too many attempts.", auth_error),
            },
        },
    }
    schema["paths"]["/api/auth/login"] = {
        "servers": auth_server,
        "post": {
            "tags": ["Authentication"],
            "summary": "Log in with email and password",
            "operationId": "loginAccount",
            "requestBody": body(
                {
                    "type": "object",
                    "required": ["email", "password"],
                    "properties": {
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string", "format": "password"},
                    },
                }
            ),
            "responses": {
                "200": response("Signed in; returns the JWT used by protected scanner routes.", auth_response),
                "400": response("Email or password is missing or invalid.", auth_error),
                "401": response("Credentials are incorrect.", auth_error),
                "429": response("Too many attempts.", auth_error),
            },
        },
    }
    schema["paths"]["/api/auth/google"] = {
        "servers": auth_server,
        "post": {
            "tags": ["Authentication"],
            "summary": "Sign in with Google",
            "description": "Send the Google Identity Services ID token. The response contains the shared API JWT.",
            "operationId": "loginWithGoogle",
            "requestBody": body(
                {
                    "type": "object",
                    "required": ["credential"],
                    "properties": {"credential": {"type": "string"}},
                }
            ),
            "responses": {
                "200": response("Google identity verified.", auth_response),
                "400": response("Google credential could not be verified.", auth_error),
                "401": response("Google identity could not be verified.", auth_error),
                "503": response("Google sign-in is not configured.", auth_error),
                "429": response("Too many attempts.", auth_error),
            },
        },
    }
    schema["paths"]["/api/auth/forgot-password"] = {
        "servers": auth_server,
        "post": {
            "tags": ["Authentication"],
            "summary": "Request a password-reset email",
            "description": "Returns the same message whether or not an account exists.",
            "operationId": "requestPasswordReset",
            "requestBody": body(
                {
                    "type": "object",
                    "required": ["email"],
                    "properties": {"email": {"type": "string", "format": "email"}},
                }
            ),
            "responses": {
                "200": response("Generic reset request response.", auth_message),
                "400": response("Email address is invalid.", auth_error),
                "429": response("Too many attempts.", auth_error),
            },
        },
    }
    schema["paths"]["/api/auth/reset-password/{token}"] = {
        "servers": auth_server,
        "post": {
            "tags": ["Authentication"],
            "summary": "Set a new password with an emailed reset token",
            "description": "Reset tokens are single-use and expire after 15 minutes. A successful reset returns the shared API JWT.",
            "operationId": "resetPassword",
            "parameters": [
                {
                    "name": "token",
                    "in": "path",
                    "required": True,
                    "description": "Raw one-time token from the email.",
                    "schema": {"type": "string"},
                }
            ],
            "requestBody": body(
                {
                    "type": "object",
                    "required": ["password"],
                    "properties": {"password": password},
                }
            ),
            "responses": {
                "200": response("Password changed; a shared API JWT is returned.", auth_response),
                "400": response("Password is too short or reset token is invalid/expired.", auth_error),
                "429": response("Too many attempts.", auth_error),
            },
        },
    }
    return schema
