"""Domain status values stored in the database."""

import enum


class JobStatus(str, enum.Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"


class ItemStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
