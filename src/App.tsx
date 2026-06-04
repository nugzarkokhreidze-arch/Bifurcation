// ... (კოდის დანარჩენი ნაწილი ზემოთ უცვლელი რჩება)

  useEffect(() => {
    const loadAppData = async () => {
      // 🔮 სერვერზე დაკავშირების ნაცვლად, პირდაპირ ადგილობრივი მონაცემებით ვაჰიდრატებთ აპლიკაციას
      const mData = await marathonService.getMarathons();
      setMarathons(mData);
      setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
      setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
      console.log("Application state hydrated successfully from local storage.");
    };
    loadAppData();
  }, [stateTick, currentTab]);

// ... (handleStateUpdate და სხვა ფუნქციები უცვლელია)

  const handleVote = async (subId: string) => {
    const subs = storageService.loadData<any[]>("bifurcation_submissions", []);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;

    let voterId = currentUser ? currentUser.id : null;
    if (!voterId) {
      voterId = localStorage.getItem("bifurcation_guest_voter_id");
      if (!voterId) {
        voterId = "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("bifurcation_guest_voter_id", voterId);
      }
    }

    if (!sub.likedBy) sub.likedBy = [];
    if (voterId && sub.likedBy.includes(voterId)) return;

    if (voterId) sub.likedBy.push(voterId);
    sub.votes = sub.likedBy.length;
    sub.likes = sub.likedBy.length;

    storageService.saveData("bifurcation_submissions", subs);

    // 🚀 სერვერის მოთხოვნა ამოღებულია, რადგან ვაკეთებთ "local-first" აპლიკაციას
    
    const creatorPlayerId = sub.playerId;
    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;

    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    let record = records.find(r => r.playerId === creatorPlayerId && r.marathonId === mId);
    
    if (!record) {
      const players = storageService.loadData<any[]>(storageKeys.players, []);
      const creatorInst = players.find(p => p.id === creatorPlayerId);
      record = {
        id: `record-${creatorPlayerId}-${mId}`,
        playerId: creatorPlayerId,
        marathonId: mId,
        participationConfirmed: true,
        points: creatorInst ? (creatorInst.points || 100) : 100,
        acceptedChallenges: [],
        completedChallenges: [],
        skippedChallenges: [],
        acceptedDates: {},
        likes: 0
      };
      records.push(record);
    }

    record.likes = (record.likes || 0) + 1;
    record.points = (record.points || 100) + 5;

    storageService.saveData(storageKeys.monthlyPlayerRecords, records);

    const playersList = storageService.loadData<any[]>(storageKeys.players, []);
    const updatedPlayers = playersList.map(p => {
      if (p.id === creatorPlayerId) {
        p.points = (p.points || 0) + 5;
        p.votesReceived = (p.votesReceived || 1) + 1;
      }
      return p;
    });
    storageService.saveData(storageKeys.players, updatedPlayers);

    if (currentUser && currentUser.id === creatorPlayerId) {
      const updatedUser = {
        ...currentUser,
        points: (currentUser.points || 0) + 5,
        votesReceived: (currentUser.votesReceived || 0) + 1
      };
      localStorage.setItem("bifurcation_session_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }

    setSubmissions(subs);
    setMonthlyPlayerRecords(records);
    handleStateUpdate();
  };
