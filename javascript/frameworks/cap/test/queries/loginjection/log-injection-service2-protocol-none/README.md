# Log Injection PoC

This application demonstrates the possibility of a log injection through communications between several `ApplicationService`s with one dedicated to logging.

The `ApplicationService`s randomly mixes JS class definitions with `cds.service.impl` for diversity.

## It _is_ a true positive case

Service2 is marked as internal, but Service1 still receives and hands over an untrusted value to Service2 from the outside.
