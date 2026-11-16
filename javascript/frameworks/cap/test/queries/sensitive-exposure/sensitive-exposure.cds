namespace advanced_security.log_exposure.sample_entities;

entity Authors {
  key ID : Integer @PersonalData.FieldSemantics: 'DataSubjectID';
  email : String @PersonalData.IsPotentiallyPersonal: false;
  profile : Association to Users { userId as selected } @PersonalData.IsPotentiallySensitive;
  disabled : String @PersonalData.IsPotentiallyPersonal: false @PersonalData.IsPotentiallySensitive: false;
  userId : Integer;
  manager : Association to Users;
}

entity Users {
  key userId : String @PersonalData.IsPotentiallyPersonal @PersonalData.IsPotentiallySensitive: false;
  key publicId : String;
}

annotate Authors with {
  email @PersonalData.IsPotentiallySensitive;
};
