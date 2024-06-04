# Log Injection PoC

This application demonstrates the possibility of a log injection through communications between several `ApplicationService`s with one dedicated to logging.

The `ApplicationService`s randomly mixes JS class definitions with `cds.service.impl` for diversity.

## It _is_ a true positive case

Service2 is still not marked as internal, so if `Received2` event is fired from the outside with user-controlled data, Service2 can still trigger log injection.
