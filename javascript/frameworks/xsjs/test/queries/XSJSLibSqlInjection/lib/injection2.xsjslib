function test2(requestParameters) {
  let query = "INSERT INTO " + requestParameters + ".ENTITY (COL1) VALUES (" + requestParameters + ")";

  let dbConnection = $.db.getConnection();
  let preparedStatement = dbConnection.prepareStatement(query);
  preparedStatement.executeUpdate();
  dbConnection.commit();
}
