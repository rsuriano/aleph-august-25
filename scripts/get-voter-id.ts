const first = 1658430000; // firstVotingRoundStartTs
const dur = 90; // votingEpochDurationSeconds
// const ts = Math.floor(new Date("2025-08-30T13:50:10Z").getTime() / 1000);
const ts = Math.floor(1756580025);

const voterId = Math.floor((ts - first) / dur);

console.log(voterId);
