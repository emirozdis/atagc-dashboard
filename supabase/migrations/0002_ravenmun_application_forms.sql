-- Initial public form definitions. Admins can edit these records after launch.
insert into public.application_forms (application_type, slug, title, description, fee, version, is_active, questions)
values
('delegate', 'delegate', 'Delegate application', 'Apply to represent a country or organization in committee.', 0, 2, true, $$[
  {"id":"fullName","label":"Full name","type":"text","required":true},
  {"id":"email","label":"Email address","type":"email","required":true},
  {"id":"phone","label":"Phone number","type":"tel","required":true},
  {"id":"school","label":"School or organization","type":"text","required":true},
  {"id":"city","label":"City and country","type":"text","required":true},
  {"id":"grade","label":"Grade","type":"select","required":true,"options":[{"value":"prep","label":"Preparation"},{"value":"9","label":"9th Grade"},{"value":"10","label":"10th Grade"},{"value":"11","label":"11th Grade"},{"value":"12","label":"12th Grade"},{"value":"university","label":"Graduate"}]},
  {"id":"choice1","label":"1. Committee Choice","type":"select","required":true},
  {"id":"choice2","label":"2. Committee Choice","type":"select","required":false},
  {"id":"choice3","label":"3. Committee Choice","type":"select","required":false},
  {"id":"experience","label":"Previous MUN experience","type":"textarea","required":true},
  {"id":"motivationLetter","label":"Why would you like to attend RavenMUN?","type":"textarea","required":true},
  {"id":"dietaryPreferences","label":"Dietary or accessibility requirements","type":"textarea"}
]$$),
('chairboard', 'chairboard', 'Chairboard application', 'Apply to serve as a chairboard member.', 0, 2, true, $$[
  {"id":"fullName","label":"Full name","type":"text","required":true},
  {"id":"email","label":"Email address","type":"email","required":true},
  {"id":"phone","label":"Phone number","type":"tel","required":true},
  {"id":"school","label":"School or organization","type":"text","required":true},
  {"id":"city","label":"City and country","type":"text","required":true},
  {"id":"choice1","label":"1. Committee Choice","type":"select","required":true},
  {"id":"choice2","label":"2. Committee Choice","type":"select","required":false},
  {"id":"choice3","label":"3. Committee Choice","type":"select","required":false},
  {"id":"experience","label":"Previous MUN experience","type":"textarea","required":true},
  {"id":"motivationLetter","label":"Why would you like to chair at RavenMUN?","type":"textarea","required":true},
  {"id":"references","label":"References or prior chairing experience","type":"textarea"},
  {"id":"dietaryPreferences","label":"Dietary or accessibility requirements","type":"textarea"}
]$$),
('delegation', 'delegation', 'Delegation application', 'Register a delegation and invite its members after submission.', 0, 1, true, $$[
  {"id":"fullName","label":"Delegation owner full name","type":"text","required":true},
  {"id":"email","label":"Owner email address","type":"email","required":true},
  {"id":"phone","label":"Phone number","type":"tel","required":true},
  {"id":"delegationName","label":"Delegation name","type":"text","required":true},
  {"id":"school","label":"School or organization","type":"text","required":true},
  {"id":"city","label":"City and country","type":"text","required":true},
  {"id":"numberOfDelegates","label":"Expected number of delegates","type":"number","required":true},
  {"id":"additionalInfo","label":"Additional information","type":"textarea"}
]$$),
('press', 'press', 'Press application', 'Apply to join the RavenMUN press team.', 0, 1, true, $$[
  {"id":"fullName","label":"Full name","type":"text","required":true},
  {"id":"email","label":"Email address","type":"email","required":true},
  {"id":"phone","label":"Phone number","type":"tel","required":true},
  {"id":"school","label":"School or organization","type":"text","required":true},
  {"id":"experience","label":"Press or media experience","type":"textarea","required":true},
  {"id":"motivationLetter","label":"Why would you like to join the press team?","type":"textarea","required":true},
  {"id":"cameraModel","label":"Camera or equipment details","type":"text"},
  {"id":"dietaryPreferences","label":"Dietary or accessibility requirements","type":"textarea"}
]$$),
('observer', 'observer', 'Observer application', 'Apply to attend RavenMUN as an observer.', 0, 1, true, $$[
  {"id":"fullName","label":"Full name","type":"text","required":true},
  {"id":"email","label":"Email address","type":"email","required":true},
  {"id":"phone","label":"Phone number","type":"tel","required":true},
  {"id":"school","label":"School or organization","type":"text","required":true},
  {"id":"city","label":"City and country","type":"text","required":true},
  {"id":"experience","label":"Previous MUN experience","type":"textarea"},
  {"id":"motivationLetter","label":"Why would you like to observe RavenMUN?","type":"textarea","required":true},
  {"id":"availability","label":"Availability and accessibility requirements","type":"textarea"}
]$$)
on conflict (application_type) do update set
  title = excluded.title,
  description = excluded.description,
  questions = excluded.questions,
  version = excluded.version,
  is_active = excluded.is_active,
  updated_at = now();
