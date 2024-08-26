cond && thenBranch || elseBranch;
!cond && thenBranch || elseBranch;

(cond && thenBranch) || elseBranch;
(!cond && thenBranch) || elseBranch;

cond && thenBranch;
!cond && thenBranch;

cond || elseBranch;
!cond || elseBranch;

cond1 && cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
!cond1 && cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
cond1 && !cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
cond1 && cond2 && !cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);

(cond1 && cond2 && cond3) && thenBranch || (elseBranchPart1 || elseBranchPart2);
!(cond1 && cond2 && cond3) && thenBranch || (elseBranchPart1 || elseBranchPart2);

(cond1 && cond2 && cond3 && thenBranch) || elseBranchPart1 || elseBranchPart2;
(!cond1 && cond2 && cond3 && thenBranch) || elseBranchPart1 || elseBranchPart2;
(cond1 && !cond2 && cond3 && thenBranch) || elseBranchPart1 || elseBranchPart2;
(cond1 && cond2 && !cond3 && thenBranch) || elseBranchPart1 || elseBranchPart2;
((cond1 && cond2 && cond3) && thenBranch) || elseBranchPart1 || elseBranchPart2;

cond1 && cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
!cond1 && cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
cond1 && !cond2 && cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
cond1 && !cond2 && !cond3 && thenBranch || (elseBranchPart1 || elseBranchPart2);
!(cond1 && cond2 && cond3) && thenBranch || (elseBranchPart1 || elseBranchPart2);

(cond && ((cond1 && thenBranch1) || elseBranch1)) || elseBranch;
(!cond && ((cond1 && thenBranch1) || elseBranch1)) || elseBranch;
!(cond && ((cond1 && thenBranch1) || elseBranch1)) || elseBranch;

(cond && (cond1 && thenBranch1 || elseBranch1)) || elseBranch;
(!cond && (cond1 && thenBranch1 || elseBranch1)) || elseBranch;
!(cond && (cond1 && thenBranch1 || elseBranch1)) || elseBranch;