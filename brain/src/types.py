import dataclasses
import dataclasses_json
import datetime
import typing
import sanic.response

class Entry():
    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

@dataclasses.dataclass
class MessageBuffer(Entry, dataclasses_json.DataClassJsonMixin):
    message: str
    timestamp: int
    error: bool

@dataclasses.dataclass
class Zap(Entry):
    """
    A zap is a record of a eye activity.
    """
    uuid: str
    memory: float
    cpu: float
    time: int
    disk: typing.Optional[int] = None
    messages: typing.Optional[typing.List[MessageBuffer]] = None

    def __post_init__(self):
        if self.messages is not None:
            self.messages = [MessageBuffer(**m) for m in self.messages]

@dataclasses.dataclass
class Introduction(Entry):
    """
    An introduction is a record of the start of brain activity
    """
    pid: int
    parent_pid: int
    name: str
    args: str
    host: str
    user: str
    time: int

@dataclasses.dataclass
class Exit(Entry):
    """
    An exit is a record of the end of brain activity
    """
    uuid: str
    exit_code: int
    time: int
    messages: typing.Optional[typing.List[MessageBuffer]] = None

    def __post_init__(self):
        if self.messages is not None:
            self.messages = [MessageBuffer(**m) for m in self.messages]

class NormalResponse(sanic.response.HTTPResponse):
    def __init__(self, **kwargs):
        super().__init__(status=204, **kwargs)

class IntroductionResponse(sanic.response.HTTPResponse):
    def __init__(self, **kwargs):
        super().__init__(status=201, **kwargs)

class CommandResponse(sanic.response.HTTPResponse):
    def __init__(self, **kwargs):
        super().__init__(status=200, **kwargs)

@dataclasses.dataclass
class UIRequest:
    """
    A request for UI data.
    """
    uuid: str
    start: typing.Optional[int] = None
    end: typing.Optional[int] = None

    def __post_init__(self):
        if self.start is not None:
            self.start = int(self.start)

        if self.end is not None:
            self.end = int(self.end)

    def to_query_dict(self) -> dict:
        query_dict = {
            "uuid": self.uuid,
        }

        if self.start is not None:
            query_dict.setdefault("time", {})["$gte"] = self.start

        if self.end is not None:
            query_dict.setdefault("time", {})["$lte"] = self.end

        return query_dict

    @classmethod
    def from_request(cls, uuid: str, request: sanic.Request):
        return cls(
            uuid=uuid,
            start=request.args.get("start"),
            end=request.args.get("end")
        )

@dataclasses.dataclass
class ActionRequest(dataclasses_json.DataClassJsonMixin):
    """
    A request to perform an action on a given UUID.
    """
    uuid: str
    action: str
    time: int = dataclasses.field(default_factory=lambda: int(datetime.datetime.now().timestamp()))
    handled: bool = False

@dataclasses.dataclass
class IntroductionUIResponse(dataclasses_json.DataClassJsonMixin):
    """
    A response to get the introduction of a given UUID.
    """
    uuid: str
    host: str
    ip: str
    pid: int
    parent_pid: int
    name: str
    args: str
    created_time: int

@dataclasses.dataclass
class StatusResponse(dataclasses_json.DataClassJsonMixin):
    """
    A response to get the status of a given UUID.
    """
    exited: bool

@dataclasses.dataclass
class MetricsResponseStructure(dataclasses_json.DataClassJsonMixin):
    """
    A response to get the metrics of a given UUID.
    """
    cpu: float
    memory: float
    disk: float
    time: int

@dataclasses.dataclass
class ExitResponse(dataclasses_json.DataClassJsonMixin):
    """
    A response to get the exit of a given UUID.
    """
    exit_code: int
    time: int
    messages: typing.Optional[typing.List[MessageBuffer]] = None
