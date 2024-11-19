from . import types, settings
import sanic.response
import pymongo
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

async def add_entry(entry: types.Zap | types.Introduction | types.Exit) -> sanic.response.HTTPResponse:
    """
    Add an entry to the database.
    """
    return await asyncio.to_thread(_add_entry, entry)

def _add_entry(entry: types.Zap | types.Introduction | types.Exit) -> sanic.response.HTTPResponse:
    """
    Add an entry to the  database.

    If Exit is passed, reset user action flags.

    Returns variable responses based on user actions.
    """
    collection = ENTRY_TYPES[type(entry)]

    if isinstance(entry, types.Introduction):
        uuid = str(collection.insert_one(entry.to_dict()).inserted_id)
        return types.IntroductionResponse(body=uuid.encode())
    else:
        collection.insert_one(entry.to_dict())

    user_action = USER_ACTIONS.find_one({"uuid": entry.uuid}, sort=[("time", pymongo.DESCENDING)])

    if isinstance(entry, types.Exit) and user_action is not None and not user_action["handled"]:
        user_action["handled"] = True
        USER_ACTIONS.update_one({"_id": user_action["_id"]}, {"$set": user_action})
    elif user_action is None or user_action["handled"]:
        return types.NormalResponse()

    return types.CommandResponse(body=user_action["action"].encode())
