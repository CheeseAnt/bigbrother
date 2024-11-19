import sanic
import sanic.response
import msgpack
from . import types, database

app = sanic.Sanic("Brain")

@app.route("/zap", methods=["POST"])
async def zap(request: sanic.Request):
    """
    Record a zap.
    """
    payload = msgpack.unpackb(request.body)
    zap = types.Zap(**payload)

    return await database.add_entry(zap)

@app.route("/introduction", methods=["POST"])
async def introduction(request: sanic.Request):
    """
    Record an introduction.
    """
    payload = msgpack.unpackb(request.body)
    introduction = types.Introduction(**payload)

    return await database.add_entry(introduction)

@app.route("/exit", methods=["POST"])
async def exit_route(request: sanic.Request):
    """
    Record an exit.
    """
    payload = msgpack.unpackb(request.body)
    exito = types.Exit(**payload)

    return await database.add_entry(exito)

