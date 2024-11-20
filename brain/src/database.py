from . import types, settings
import sanic.response
import pymongo
import pymongo.cursor
import bson
import asyncio

client = pymongo.MongoClient(settings.MONGO_URI)
db = client["brain"]

ZAPS = db["zaps"]
INTRODUCTIONS = db["introductions"]
EXITS = db["exits"]
USER_ACTIONS = db["user_actions"]

ENTRY_TYPES = {
    types.Zap: ZAPS,
    types.Introduction: INTRODUCTIONS,
    types.Exit: EXITS
}

async def add_entry(entry: types.Zap | types.Introduction | types.Exit, request: sanic.Request) -> sanic.response.HTTPResponse:
    """
    Add an entry to the database.
    """
    return await asyncio.to_thread(_add_entry, entry, request)

def _add_entry(entry: types.Zap | types.Introduction | types.Exit, request: sanic.Request) -> sanic.response.HTTPResponse:
    """
    Add an entry to the  database.

    If Exit is passed, reset user action flags.

    Returns variable responses based on user actions.
    """
    collection = ENTRY_TYPES[type(entry)]

    if isinstance(entry, types.Introduction):
        entry_dict = entry.to_dict()
        entry_dict["ip"] = request.ip
        entry_dict["exited"] = False
        uuid = str(collection.insert_one(entry_dict).inserted_id)
        return types.IntroductionResponse(body=uuid.encode())
    else:
        collection.insert_one(entry.to_dict())

    if isinstance(entry, types.Exit):
        INTRODUCTIONS.update_one({"_id": bson.ObjectId(entry.uuid)}, {"$set": {"exited": True}})

    user_action = USER_ACTIONS.find_one({"uuid": entry.uuid}, sort=[("time", pymongo.DESCENDING)])

    if isinstance(entry, types.Exit) and user_action is not None and not user_action["handled"]:
        user_action["handled"] = True
        USER_ACTIONS.update_one({"_id": bson.ObjectId(user_action["_id"])}, {"$set": user_action})

    elif user_action is None or user_action["handled"]:
        return types.NormalResponse()

    return types.CommandResponse(body=user_action["action"].encode())

async def async_introduction_find(*args, **kwargs) -> pymongo.cursor.Cursor:
    """
    Find introductions.
    """
    return await asyncio.to_thread(INTRODUCTIONS.find, *args, **kwargs)

async def async_introduction_find_partial(query: dict) -> list[str]:
    """
    Find partial for introductions.
    """
    eyes = await asyncio.to_thread(INTRODUCTIONS.find, query, projection=["_id"], sort=[("time", pymongo.DESCENDING)])
    return [eye["_id"].binary.hex() for eye in eyes]

async def get_eyeballs(inactive: bool = False) -> list[str]:
    """
    Get all eyeballs.
    """
    if inactive:
        return list(await async_introduction_find_partial({}))

    return list(await async_introduction_find_partial({"exited": {"$ne": True}}))

async def get_eyeballs_body(body: str, inactive: bool = False) -> list[str]:
    """
    Get all eyeballs by body.
    """
    if inactive:
        eyeballs = await async_introduction_find_partial({"host": body})
    else:
        eyeballs = await async_introduction_find_partial({"host": body, "exited": {"$ne": True}})

    return eyeballs

async def get_eyeballs_ip(ip: str, inactive: bool = False) -> list[str]:
    """
    Get all eyeballs by IP.
    """
    if inactive:
        return list(await async_introduction_find_partial({"ip": ip}))
    return list(await async_introduction_find_partial({"ip": ip, "exited": {"$ne": True}}))

async def get_bodies(inactive: bool = False) -> list[str]:
    """
    Get all bodies.
    """

    if inactive:
        bodies = await async_introduction_find({}, sort=[("time", pymongo.DESCENDING)], projection={"host": 1, "_id": 0})
    else:
        bodies = await async_introduction_find({"exited": {"$ne": True}}, sort=[("time", pymongo.DESCENDING)], projection={"host": 1, "_id": 0})

    return list(bodies.distinct("host"))

async def get_ips(inactive: bool = False) -> list[str]:
    """
    Get all IPs.
    """
    if inactive:
        ips = await async_introduction_find({}, sort=[("time", pymongo.DESCENDING)], projection={"ip": 1, "_id": 0})
    else:
        ips = await async_introduction_find({"exited": {"$ne": True}}, sort=[("time", pymongo.DESCENDING)], projection={"ip": 1, "_id": 0})

    return list(ips.distinct("ip"))

async def delete_eyeball(uuid: str):
    """
    Delete a given eyeball.
    """
    def _delete_eyeball():
        ZAPS.delete_many({"uuid": uuid})
        INTRODUCTIONS.delete_one({"_id": bson.ObjectId(uuid)})
        EXITS.delete_many({"uuid": uuid})
        USER_ACTIONS.delete_many({"uuid": uuid})

    await asyncio.to_thread(_delete_eyeball)

async def get_status(uuid: str) -> types.StatusResponse:
    """
    Get status for a given UUID.
    """
    intro_dict = (await async_introduction_find({"_id": bson.ObjectId(uuid)}))[0]
    status_dict = {
        "uuid": intro_dict["_id"].binary.hex(),
        "host": intro_dict["host"],
        "ip": intro_dict["ip"],
        "pid": intro_dict["pid"],
        "parent_pid": intro_dict["parent_pid"],
        "name": intro_dict["name"],
        "args": intro_dict["args"],
        "created_time": intro_dict["time"],
        "exited": intro_dict["exited"],
    }

    return types.StatusResponse(**status_dict)

async def get_metrics(ui_request: types.UIRequest) -> list[types.MetricsResponseStructure]:
    """
    Get metrics for a given UUID.
    """
    metrics_dict = await asyncio.to_thread(ZAPS.find,
        ui_request.to_dict(),
        sort=[("time", pymongo.ASCENDING)],
        projection={"cpu": 1, "memory": 1, "disk": 1, "time": 1, "_id": 0},
    )

    return [types.MetricsResponseStructure(**metric) for metric in metrics_dict]

async def get_exit(uuid: str) -> types.ExitResponse:
    """
    Get exit for a given UUID.
    """
    exit_dict = (await asyncio.to_thread(EXITS.find_one, {"uuid": uuid}, projection={"exit_code": 1, "time": 1, "messages": 1, "_id": 0}))

    return types.ExitResponse(**exit_dict)

async def get_messages(ui_request: types.UIRequest) -> list[types.MessageBuffer]:
    """
    Get messages for a given UUID.
    """

    messages_dicts = await asyncio.to_thread(ZAPS.find,
        ui_request.to_dict(),
        sort=[("time", pymongo.ASCENDING)],
        projection={"messages": 1, "_id": 0},
    )

    return [types.MessageBuffer(**message) for message_dict in messages_dicts for message in message_dict["messages"]]

async def perform_action(action_request: types.ActionRequest):
    """
    Perform an action on a given UUID.
    """
    await asyncio.to_thread(USER_ACTIONS.insert_one, action_request.to_dict())