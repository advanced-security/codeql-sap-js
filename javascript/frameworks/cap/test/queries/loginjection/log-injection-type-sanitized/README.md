# Sanitized Log Injection

This application demonstrates how a potential injection vulnerability is not reported if the data type definied in the service description is not strings.

## It _is_ a false positive case

Service responds to a Received event and logs the data. However, the type of the message (Integer) does not allow for the injection to succeed.
