import sanic
import sanic.response
import msgpack
import sanic_cors

from . import types, database

app = sanic.Sanic("Brain")
sanic_cors.CORS(app)

telemetry = sanic.Blueprint("telemetry", url_prefix="/telemetry")
app.blueprint(telemetry)

ui = sanic.Blueprint("ui", url_prefix="/ui")
app.blueprint(ui)

### TELEMETRY ###

@telemetry.route("/zap", methods=["POST"])
async def zap(request: sanic.Request):
    """
    Record a zap.
    """
    payload = msgpack.unpackb(request.body)
    zap = types.Zap(**payload)

    return await database.add_entry(entry=zap, request=request)

@telemetry.route("/introduction", methods=["POST"])
async def introduction(request: sanic.Request):
    """
    Record an introduction.
    """
    payload = msgpack.unpackb(request.body)
    introduction = types.Introduction(**payload)

    return await database.add_entry(entry=introduction, request=request)

@telemetry.route("/exit", methods=["POST"])
async def exit_route(request: sanic.Request):
    """
    Record an exit.
    """
    payload = msgpack.unpackb(request.body)
    exito = types.Exit(**payload)

    return await database.add_entry(entry=exito, request=request)

### UI - listings ###

@ui.route("/eyeballs", methods=["GET"])
async def eyeballs(request: sanic.Request):
    """
    Get all eyeballs.
    """
    inactive = request.args.get("inactive", "false").lower() == "true"

    return sanic.response.json(await database.get_eyeballs(inactive=inactive))

@ui.route("/eyeballs/<body>", methods=["GET"])
async def eyeballs_body(request: sanic.Request, body: str):
    """
    Get all eyeballs by body.
    """
    inactive = request.args.get("inactive", "false").lower() == "true"

    return sanic.response.json(await database.get_eyeballs_body(body=body, inactive=inactive))

@ui.route("/eyeballs/ip/<ip>", methods=["GET"])
async def eyeballs_ip(request: sanic.Request, ip: str):
    """
    Get all eyeballs by IP.
    """
    inactive = request.args.get("inactive", "false").lower() == "true"

    return sanic.response.json(await database.get_eyeballs_ip(ip=ip, inactive=inactive))

@ui.route("/bodies", methods=["GET"])
async def bodies(request: sanic.Request):
    """
    Get all bodies.
    """
    inactive = request.args.get("inactive", "false").lower() == "true"

    return sanic.response.json(await database.get_bodies(inactive=inactive))

@ui.route("/ips", methods=["GET"])
async def ips(request: sanic.Request):
    """
    Get all IPs.
    """
    inactive = request.args.get("inactive", "false").lower() == "true"

    return sanic.response.json(await database.get_ips(inactive=inactive))

### UI - by UUID ###

@ui.route("/introduction/<uuid>", methods=["GET"])
async def introduction(request: sanic.Request, uuid: str):
    """
    Get introduction for a given UUID.
    """
    return sanic.response.json((await database.get_introduction(uuid=uuid)).to_dict(encode_json=True))

@ui.route("/status/<uuid>", methods=["GET"])
async def status(request: sanic.Request, uuid: str):
    """
    Get status for a given UUID.
    """
    return sanic.response.json((await database.get_status(uuid=uuid)).to_dict(encode_json=True))

@ui.route("/exit/<uuid>", methods=["GET"])
async def exit(request: sanic.Request, uuid: str):
    """
    Get exit for a given UUID.
    """
    return sanic.response.json((await database.get_exit(uuid=uuid)).to_dict(encode_json=True))

@ui.route("/delete/<uuid>", methods=["DELETE"])
async def delete(request: sanic.Request, uuid: str):
    """
    Delete a given UUID.
    """

    await database.delete_eyeball(uuid=uuid)

    return sanic.response.HTTPResponse()

@ui.route("/messages/<uuid>", methods=["GET"])
async def messages(request: sanic.Request, uuid: str):
    """
    Get messages for a given UUID.
    """
    ui_request = types.UIRequest.from_request(uuid=uuid, request=request)

    messages = await database.get_messages(ui_request=ui_request)

    return sanic.response.json([message.to_dict() for message in messages])

@ui.route("/metrics/<uuid>", methods=["GET"])
async def metrics(request: sanic.Request, uuid: str):
    """
    Get metrics for a given UUID.
    """
    ui_request = types.UIRequest.from_request(uuid=uuid, request=request)

    metrics = await database.get_metrics(ui_request=ui_request)

    return sanic.response.json([metric.to_dict(encode_json=True) for metric in metrics])

@ui.route("/action/<uuid>/<action>", methods=["PUT"])
async def action(request: sanic.Request, uuid: str, action: str):
    """
    Perform an action on a given UUID.
    """
    action_request = types.ActionRequest(uuid=uuid, action=action)

    await database.perform_action(action_request=action_request)

    return sanic.response.HTTPResponse()
