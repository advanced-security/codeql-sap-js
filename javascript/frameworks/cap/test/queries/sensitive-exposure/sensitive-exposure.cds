namespace advanced_security.log_exposure.sample_entities;

entity Sample {
    name         : String(111);
    dateOfBirth  : Date;
}

// annotations for Data Privacy
annotate Sample with
@PersonalData : { DataSubjectRole : 'Sample', EntitySemantics : 'DataSubject' }
{
  name  @PersonalData.IsPotentiallySensitive;
  dateOfBirth     @PersonalData.IsPotentiallyPersonal; 
}