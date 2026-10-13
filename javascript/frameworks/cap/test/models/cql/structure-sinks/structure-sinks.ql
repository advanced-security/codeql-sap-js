import javascript

from DataFlow::Node sink
where sink = ModelOutput::getASinkNode("cap-cql-structure").asSink()
select sink, sink.toString()
