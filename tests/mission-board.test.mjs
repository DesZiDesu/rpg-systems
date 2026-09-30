import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMissionBoard,confirmedMissionBoard,boardQuest,missionQuest} from '../src/mission-board.js';
const story = 'You walk up to the mission board and read the available jobs.';
const board = {title:'Guild Board',location:'Guild Hall',evidence:story,missions:[{name:'Deliver medicine',objective:'Bring medicine to Cora',reward:'5 silver',objectives:[{title:'Reach Cora',status:'Completed'}]}]};
test('board accepts confirmed current visits in English and Thai, rejects future/OOC/mismatched and invented evidence',()=>{
    assert(confirmedMissionBoard(board,story,'I approach the board.','Guild Hall'));
    const th = 'คุณเดินมาถึงกระดานภารกิจและอ่านใบประกาศ';
    assert(confirmedMissionBoard({...board,evidence:th},th,'ฉันเดินไปดูกระดานภารกิจ','Guild Hall'));
    for (const evidence of ['Tomorrow you will read the mission board.','You have not yet reached the mission board.','You do not approach the mission board.','คุณวางแผนจะเดินไปกระดานภารกิจพรุ่งนี้','The mission board is mentioned in an old letter.']) {
        assert.equal(confirmedMissionBoard({...board,evidence},evidence,'Continue.','Guild Hall'),null,evidence);
    }
    assert.equal(confirmedMissionBoard(board,story,'OOC: explain quest boards','Guild Hall'),null);
    assert.equal(confirmedMissionBoard(board,story,'Continue','Street'),null);
    assert.equal(confirmedMissionBoard(board,'A different scene','Continue','Guild Hall'),null);
});
test('normalization limits boards to four unique valid papers with stable IDs and pending objectives',()=>{
    const many = normalizeMissionBoard({...board,missions:[...board.missions,...board.missions,...Array.from({length:6},(_,i)=>({name:`Job ${i}`,objective:'Task'})),{name:'Missing objective'}]});
    assert.equal(many.missions.length,4);
    assert.equal(many.missions[0].objectives[0].status,'Pending');
    assert.equal(many.missions[0].id,normalizeMissionBoard(board).missions[0].id);
    assert.equal(normalizeMissionBoard({...board,missions:[{name:'No task'}]}),null);
    assert.equal(normalizeMissionBoard({...board,location:''}),null);
    assert.doesNotThrow(()=>normalizeMissionBoard({...board,missions:[{name:'Job',objective:'Task',objectives:{filter:12}}]}));
    const quest = boardQuest(many.missions[0],many);
    assert.equal(quest.status,'Active'); assert.equal(quest.rewardClaimed,false); assert.equal(quest.progress,0);
    assert.equal(missionQuest({quests:[{id:'old',name:quest.name.toUpperCase()}]},many.missions[0]).id,'old');
});
