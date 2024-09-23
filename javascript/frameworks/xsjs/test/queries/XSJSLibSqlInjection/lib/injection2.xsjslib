/**
 * True positive case: Sink being `$.db.Connection.prepareStatement(query, arguments...)`,
 * the API in the older namespace. The remote value is concatenated raw into the query.
 */
function test2(requestParameters) {
  let query = "INSERT INTO " + requestParameters + ".ENTITY (COL1) VALUES (" + requestParameters + ")";

  let dbConnection = $.db.getConnection();
  let preparedStatement = dbConnection.prepareStatement(query);
  preparedStatement.executeUpdate();
  dbConnection.commit();
}
