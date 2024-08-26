/**
 * True positive case: Sink being `$.db.Connection.prepareStatement(query, arguments...)`,
 * the API in the older namespace. The remote value is concatenated raw into the query.
 */
function test1(requestParameters) {
  let someParameterValue1 = JSON.parse(requestParameters.get("someParameter1"));
  let someParameterValue2 = JSON.parse(requestParameters.get("someParameter2"));
  let query = "INSERT INTO " + someParameterValue1 + ".ENTITY (COL1) VALUES (" + someParameterValue2 + ")";

  let dbConnection = $.db.getConnection();
  let preparedStatement = dbConnection.prepareStatement(query);
  preparedStatement.executeUpdate();
  dbConnection.commit();
}
