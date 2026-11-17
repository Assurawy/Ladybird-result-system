# Subject features (Nov 2026)

1. **Religion groups (Islamic Studies / CRK)** - already in the app. Settings, Subjects, edit a subject, "Religion group". A pupil is in the Islamic Studies group unless marked CRK in Students, Edit Profile, "Religion group". Score entry, results, report cards, class averages and the teacher dashboard follow it.
2. **Switch a subject off for a class** - Settings, Subjects, edit the subject, "Classes that do NOT take this subject". Tick the term(s) per class. Nothing is deleted; scores stay stored and return when unticked. Stored as `subject.notTaken = [{classArmId, termId}]`.
3. **Progress submission** - Score Entry shows "Recorded X% / Remaining Y%" (a score column counts when every pupil has it). "Submit progress (X%)" tells the Form Teacher how far the teacher has got. Class Review shows "Marks submitted" per subject and for the class. The full "Submit to Form Teacher" still needs every column complete, and approval/publishing still need a fully submitted subject. Stored as `state.subjectProgress["class::subject::session::term"] = {percent, names, at, by}`.

Run `npm test` (builds first, then 116 checks).
