const fs=require("fs"), vm=require("vm"), path=require("path");
const R=path.join(__dirname,"..");
let pass=0, fail=0; const t=(n,c)=>{ c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n); };
const near=(a,b)=>Math.abs(a-b)<0.011;

function world(){
  const st={ rankingConfig:{tieMethod:"competition"}, classSubjectStatus:{}, teacherAssignments:[], scores:[],
    assessmentSchemes:[{id:"as1",sectionIds:["sec1"],components:[
      {id:"c1",name:"CA1",maxScore:20,weight:20,active:true,order:1},
      {id:"c2",name:"CA2",maxScore:20,weight:20,active:true,order:2},
      {id:"c3",name:"Exam",maxScore:60,weight:60,active:true,order:3}]}],
    gradingSchemes:[{id:"g1",sectionIds:["sec1"],bands:[{grade:"A1",min:75,max:100,remark:"Excellent"},{grade:"B2",min:70,max:74,remark:"Very Good"},{grade:"B3",min:65,max:69,remark:"Good"},{grade:"C4",min:60,max:64,remark:"Credit"},{grade:"C5",min:55,max:59,remark:"Credit"},{grade:"C6",min:50,max:54,remark:"Credit"},{grade:"D7",min:45,max:49,remark:"Pass"},{grade:"E8",min:40,max:44,remark:"Pass"},{grade:"F9",min:0,max:39,remark:"Fail"}]}],
    subjects:[], classArms:[{id:"ca1",sectionId:"sec1",active:true},{id:"ca2",sectionId:"sec1",active:true}], students:[] };
  const subj=(id,extra)=>st.subjects.push(Object.assign({id,name:id,active:true,sectionIds:["sec1"],departmentIds:[],includeInAverage:true,includeInRanking:true,order:st.subjects.length+1},extra||{}));
  subj("math"); subj("eng"); subj("isl",{religiousTrack:"ISLAMIC"}); subj("crk",{religiousTrack:"CRK"});
  const stu=(id,arm,extra)=>st.students.push(Object.assign({id,name:id,classArmId:arm,status:"Active"},extra||{}));
  const ctx={console,state:st,byId:(a,id)=>a.find(x=>x.id===id)||null,uid:()=>"x"}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(R+"/source/04-engine.js","utf8"),ctx);
  const score=(sid,sub,arm,vals,extra)=>st.scores.push(Object.assign({id:"r"+st.scores.length,studentId:sid,subjectId:sub,classArmId:arm,sessionId:"se",termId:"t",components:vals},extra||{}));
  return {st,ctx,stu,score};
}
const run=(ctx,code)=>vm.runInContext(code,ctx);

// ---------- 1. finished subjects: unchanged ----------
{ const w=world(); w.stu("a","ca1"); w.score("a","math","ca1",{c1:12,c2:12,c3:50});
  const c=run(w.ctx,`computeSubjectTotal(getScoreRecord("a","math","ca1","se","t"),getAssessmentScheme(null,state.classArms[0]))`);
  t("complete subject: total 74, complete, projected = 74", c.total===74 && c.isComplete && c.projectedTotal===74);
  const o=run(w.ctx,`computeStudentOverall("a","ca1","se","t")`); const m=o.subjectRows.find(r=>r.subject.id==="math");
  t("complete subject grade B2, not provisional", m.grade==="B2" && !m.provisional && m.shownTotal===74);
}
// ---------- 2. CA only ----------
{ const w=world(); w.stu("a","ca1");
  w.score("a","math","ca1",{c1:12,c2:12}); 
  let c=run(w.ctx,`computeSubjectTotal(getScoreRecord("a","math","ca1","se","t"),getAssessmentScheme(null,state.classArms[0]))`);
  t("CA 12+12 only: not complete, raw total 24, projected 60", !c.isComplete && c.total===24 && near(c.projectedTotal,60));
  w.score("a","eng","ca1",{c1:15});
  c=run(w.ctx,`computeSubjectTotal(getScoreRecord("a","eng","ca1","se","t"),getAssessmentScheme(null,state.classArms[0]))`);
  t("one CA only (15/20): projected 75", near(c.projectedTotal,75));
  w.score("a","isl","ca1",{}); c=run(w.ctx,`computeSubjectTotal(getScoreRecord("a","isl","ca1","se","t"),getAssessmentScheme(null,state.classArms[0]))`);
  t("nothing entered: no projected total", c.projectedTotal===null);
  w.score("a","crk","ca1",{},{attendanceState:"ABSENT"}); c=run(w.ctx,`computeSubjectTotal(getScoreRecord("a","crk","ca1","se","t"),getAssessmentScheme(null,state.classArms[0]))`);
  t("absent: no projected total", c.projectedTotal===null && c.hasAbsent);
}
// ---------- 3. overall average / provisional flag ----------
{ const w=world(); w.stu("a","ca1"); w.stu("b","ca1");
  w.score("a","math","ca1",{c1:12,c2:12,c3:50});  // complete 74
  w.score("a","eng","ca1",{c1:12,c2:12});          // provisional 60
  let o=run(w.ctx,`computeStudentOverall("a","ca1","se","t")`);
  t("average now reads from the first scores: (74+60)/2 = 67", near(o.average,67) && o.countedSubjects===2);
  t("flagged provisional while subjects are incomplete", o.provisional===true && o.allComplete===false);
  const o2=run(w.ctx,`computeStudentOverall("b","ca1","se","t")`);
  t("a student with no scores has no average", o2.average===null && o2.provisional===false);
  w.score("a","isl","ca1",{c1:10,c2:10,c3:30}); w.score("a","eng","ca1",{c1:12,c2:12,c3:36}); // complete eng=60 (second record, first one wins) 
}
// ---------- 4. finished results identical to before ----------
{ const w=world(); w.stu("a","ca1");
  w.score("a","math","ca1",{c1:12,c2:12,c3:50}); w.score("a","eng","ca1",{c1:15,c2:15,c3:45});
  const o=run(w.ctx,`computeStudentOverall("a","ca1","se","t")`);
  // math 74, eng 15/20*20+15/20*20+45 = 75 ; average 74.5 ; islamic (default group) not scored
  t("with every scored subject finished the average is the plain average", near(o.average,74.5));
  w.score("a","isl","ca1",{c1:10,c2:10,c3:30});
  const o3=run(w.ctx,`computeStudentOverall("a","ca1","se","t")`);
  t("allComplete true and provisional false once every subject is in", o3.allComplete===true && o3.provisional===false);
  t("74.5 gets a grade now (B2 band 70-74 reaches it) - earlier bug stays fixed", o.subjectRows.find(r=>r.subject.id==="math").grade==="B2");
}
// ---------- 5. positions start immediately ----------
{ const w=world(); ["a","b","c"].forEach(s=>w.stu(s,"ca1"));
  w.score("a","math","ca1",{c1:20,c2:20}); w.score("b","math","ca1",{c1:10,c2:10}); w.score("c","math","ca1",{c1:15,c2:15});
  const ov=run(w.ctx,`computeClassOverview("ca1","se","t")`);
  const pos={}; ov.students.forEach(r=>pos[r.student.id]=r.position);
  t("overall positions are given from CA scores (a=1, c=2, b=3)", pos.a===1 && pos.c===2 && pos.b===3);
  t("class average reads from the same scores (100,75,50 -> 75)", near(ov.classAverage,75));
  t("every student is marked provisional", ov.students.every(r=>r.overall.provisional));
  const res=run(w.ctx,`computeSubjectClassResults("ca1","math","se","t")`);
  t("subject results: provisional rows get grade and position", res.rows.every(r=>r.provisional && r.grade!=="-" && r.position) && near(res.classAverage,75));
}
// ---------- 6. Islamic Studies / CRK groups ----------
{ const w=world(); w.stu("m1","ca1"); w.stu("m2","ca1",{religiousTrack:""}); w.stu("c1","ca1",{religiousTrack:"CRK"}); w.stu("m3","ca2");
  const names=(id,arm)=>run(w.ctx,`subjectsForStudent(byId(state.students,"${id}"),byId(state.classArms,"${arm}")).map(function(s){return s.id}).sort().join()`);
  t("Muslim student (default) gets Islamic Studies, not CRK", names("m1","ca1")==="eng,isl,math");
  t("CRK student gets CRK, not Islamic Studies", names("c1","ca1")==="crk,eng,math");
  t("CRK teacher sees only CRK students", run(w.ctx,`studentsForSubject(byId(state.subjects,"crk"),"ca1").map(function(s){return s.id}).join()`)==="c1");
  t("Islamic Studies shows only the other students", run(w.ctx,`studentsForSubject(byId(state.subjects,"isl"),"ca1").map(function(s){return s.id}).join()`)==="m1,m2");
  t("ordinary subjects still include everyone", run(w.ctx,`studentsForSubject(byId(state.subjects,"math"),"ca1").length`)===3);
  const ov1=run(w.ctx,`computeClassOverview("ca1","se","t").subjects.map(function(s){return s.id}).sort().join()`);
  const ov2=run(w.ctx,`computeClassOverview("ca2","se","t").subjects.map(function(s){return s.id}).sort().join()`);
  t("a class with a CRK student lists CRK", /crk/.test(ov1) && /isl/.test(ov1));
  t("a class with no CRK students does not list CRK", !/crk/.test(ov2) && /isl/.test(ov2));
  w.score("c1","crk","ca1",{c1:10,c2:10,c3:40});
  const o=run(w.ctx,`computeStudentOverall("c1","ca1","se","t")`);
  t("CRK student's report shows CRK and never Islamic Studies", o.subjectRows.some(r=>r.subject.id==="crk") && !o.subjectRows.some(r=>r.subject.id==="isl"));
}
// ---------- 7. completeness helper ----------
{ const w=world(); w.stu("a","ca1"); w.stu("b","ca1");
  w.score("a","eng","ca1",{c1:1,c2:1,c3:1}); 
  t("subject is NOT complete while one student has no scores", run(w.ctx,`isSubjectResultComplete("ca1","eng","se","t")`)===false);
  w.score("b","eng","ca1",{c1:1,c2:1});
  t("...nor while a student is missing the exam", run(w.ctx,`isSubjectResultComplete("ca1","eng","se","t")`)===false);
  w.st.scores.find(s=>s.studentId==="b").components.c3=5;
  t("complete when everyone has every part", run(w.ctx,`isSubjectResultComplete("ca1","eng","se","t")`)===true);
  w.st.scores.find(s=>s.studentId==="b").components={}; w.st.scores.find(s=>s.studentId==="b").attendanceState="ABSENT";
  t("an Absent student counts as complete", run(w.ctx,`isSubjectResultComplete("ca1","eng","se","t")`)===true);
  t("class overview marks the subject complete", run(w.ctx,`computeClassOverview("ca1","se","t").subjectStatuses.find(function(s){return s.subject.id==="eng"}).complete`)===true);
}
// ---------- 8. built app carries the new screens ----------
{ const app=fs.readFileSync(R+"/app.js","utf8"); 
  t("built app.js includes the provisional banner, submit rule, religion fields", /PROVISIONAL RESULT/.test(app) && /still have missing scores/.test(app) && /f-reli/.test(app) && /sub-reli/.test(app)); }

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
