import javascript

from DataFlow::Node sink
where
  sink = ModelOutput::getASinkNode("cap-cql-structure").asSink() and
  sink.getFile().getBaseName() = "structure-sinks.js"
select sink, sink.toString()
