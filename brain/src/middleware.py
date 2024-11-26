import sanic
import base64

import sanic.middleware

from . import settings

AUTH_B64 = base64.b64encode(f'{settings.USER_NAME}:{settings.PASSWORD}'.encode()).decode()
UNAUTH_RESPONSE = sanic.HTTPResponse("User is not authorized", status=401)

async def basic_auth_func(request: sanic.Request):
    if not request.path.startswith("/ui/"):
        return

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return UNAUTH_RESPONSE
    
    auth_header = auth_header.strip().split(" ")
    if auth_header[0] != "Basic":
        return UNAUTH_RESPONSE

    if auth_header[1] != AUTH_B64:
        return UNAUTH_RESPONSE

basic_auth = sanic.middleware.Middleware(func=basic_auth_func, location=sanic.middleware.MiddlewareLocation.REQUEST)
