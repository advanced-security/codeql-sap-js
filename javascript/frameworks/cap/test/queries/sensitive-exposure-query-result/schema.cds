namespace sap.capire.bookshop;

entity Authors {
  key ID : Integer;
  email  : String @PersonalData.IsPotentiallySensitive;
}

annotate Authors with
@PersonalData : { DataSubjectRole : 'Author', EntitySemantics : 'DataSubject' };
