namespace sap.capire.bookshop;

entity Authors {
  key ID : Integer;
  email  : String @PersonalData.IsPotentiallySensitive;
  emailVerified : Boolean;
}

annotate Authors with
@PersonalData : { DataSubjectRole : 'Author', EntitySemantics : 'DataSubject' };
