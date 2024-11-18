import dataclasses
import typing

@dataclasses.dataclass
class MessageBuffer:
    message: str
    timestamp: int
    error: bool

@dataclasses.dataclass
class Zap:
    """
    A zap is a record of a eye activity.
    """
    memory: float
    cpu: float
    time: int
    disk: typing.Optional[int] = None
    messages: typing.Optional[typing.List[MessageBuffer]] = None

    def __post_init__(self):
        if self.messages is not None:
            self.messages = [MessageBuffer(**m) for m in self.messages]

@dataclasses.dataclass
class Introduction:
    """
    An introduction is a record of the start of brain activity
    """
    pid: int
    name: str
    args: str
    host: str
    user: str
    time: int

@dataclasses.dataclass
class Exit:
    """
    An exit is a record of the end of brain activity
    """
    pid: int
    exit_code: int
    time: int
    messages: typing.Optional[typing.List[MessageBuffer]] = None

    def __post_init__(self):
        if self.messages is not None:
            self.messages = [MessageBuffer(**m) for m in self.messages]
