import dataclasses
import typing
import sanic.response

class Entry():
    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

@dataclasses.dataclass
class MessageBuffer(Entry):
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
