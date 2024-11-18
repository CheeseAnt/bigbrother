import sanic
import sanic.response
import msgpack
from . import types

app = sanic.Sanic("Brain")

@app.route("/zap", methods=["POST"])
async def zap(request: sanic.Request):
    """
    Record a zap.
    """
    payload = msgpack.unpackb(request.body)
    zap = types.Zap(*payload)

    print(zap)

    return sanic.response.HTTPResponse(status=200)

@app.route("/introduction", methods=["POST"])
async def introduction(request: sanic.Request):
    """
    Record an introduction.
    """
    payload = msgpack.unpackb(request.body)
    introduction = types.Introduction(*payload)
    print(introduction)

    return sanic.response.HTTPResponse(status=200)

@app.route("/exit", methods=["POST"])
async def exit_route(request: sanic.Request):
    """
    Record an exit.
    """
    payload = msgpack.unpackb(request.body)
    exito = types.Exit(*payload)
    print(exito)

    return sanic.response.HTTPResponse(status=200)

