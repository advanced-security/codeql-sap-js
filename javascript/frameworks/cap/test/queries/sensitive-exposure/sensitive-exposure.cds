namespace advanced_security.log_exposure.sample_entities;

entity Sample {
    name         : String(111);
    dateOfBirth  : Date;
}

entity Authors {
  key ID        : Integer;
  email         : String @PersonalData.IsPotentiallySensitive;
  emailVerified : Boolean;
}

// annotations for Data Privacy
annotate Sample with
@PersonalData : { DataSubjectRole : 'Sample', EntitySemantics : 'DataSubject' }
{
  name  @PersonalData.IsPotentiallySensitive;
  dateOfBirth     @PersonalData.IsPotentiallyPersonal; 
}

annotate Authors with
@PersonalData : { DataSubjectRole : 'Author', EntitySemantics : 'DataSubject' };