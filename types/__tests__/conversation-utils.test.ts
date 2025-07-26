import dayjs from 'dayjs';
import {
  sortConversationsByTime,
  sortConversationsByTimeAsc,
  sortConversationsByTitle,
  getTimeGroup,
  groupConversationsByDate,
  processConversationsWithGrouping,
  getGroupPriority,
  isGroupEmpty,
  filterEmptyGroups,
  getGroupStats,
  regroupConversations,
  getFlattenedConversations
} from '../conversation-utils';
import { Conversation, ConversationGroup } from '../conversation';
import { CONVERSATION_CONSTANTS } from '../constants';

// 测试数据
const createMockConversation = (
  id: string,
  title: string,
  timestamp: number,
  userId: string = 'user1'
): Conversation => ({
  key: id,
  label: title,
  timestamp,
  userId,
  disabled: false
});

describe('Conversation Utils - Sorting', () => {
  const now = Date.now();
  const conversations: Conversation[] = [
    createMockConversation('1', 'Conversation 1', now - 3600000), // 1 hour ago
    createMockConversation('2', 'Conversation 2', now), // now
    createMockConversation('3', 'Conversation 3', now - 7200000), // 2 hours ago
  ];

  describe('sortConversationsByTime', () => {
    it('should sort conversations by timestamp in descending order', () => {
      const sorted = sortConversationsByTime(conversations);
      expect(sorted[0].key).toBe('2'); // most recent
      expect(sorted[1].key).toBe('1');
      expect(sorted[2].key).toBe('3'); // oldest
    });

    it('should not mutate original array', () => {
      const original = [...conversations];
      sortConversationsByTime(conversations);
      expect(conversations).toEqual(original);
    });
  });

  describe('sortConversationsByTimeAsc', () => {
    it('should sort conversations by timestamp in ascending order', () => {
      const sorted = sortConversationsByTimeAsc(conversations);
      expect(sorted[0].key).toBe('3'); // oldest
      expect(sorted[1].key).toBe('1');
      expect(sorted[2].key).toBe('2'); // most recent
    });
  });

  describe('sortConversationsByTitle', () => {
    it('should sort conversations by title alphabetically', () => {
      const sorted = sortConversationsByTitle(conversations);
      expect(sorted[0].label).toBe('Conversation 1');
      expect(sorted[1].label).toBe('Conversation 2');
      expect(sorted[2].label).toBe('Conversation 3');
    });
  });
});

describe('Conversation Utils - Time Grouping', () => {
  const now = dayjs();
  const today = now.valueOf();
  const yesterday = now.subtract(1, 'day').valueOf();
  const lastWeek = now.subtract(7, 'days').valueOf();

  describe('getTimeGroup', () => {
    it('should return TODAY for today\'s timestamp', () => {
      expect(getTimeGroup(today)).toBe(CONVERSATION_CONSTANTS.GROUPS.TODAY);
    });

    it('should return YESTERDAY for yesterday\'s timestamp', () => {
      expect(getTimeGroup(yesterday)).toBe(CONVERSATION_CONSTANTS.GROUPS.YESTERDAY);
    });

    it('should return EARLIER for older timestamps', () => {
      expect(getTimeGroup(lastWeek)).toBe(CONVERSATION_CONSTANTS.GROUPS.EARLIER);
    });
  });

  describe('getGroupPriority', () => {
    it('should return correct priorities for groups', () => {
      expect(getGroupPriority(CONVERSATION_CONSTANTS.GROUPS.TODAY)).toBe(1);
      expect(getGroupPriority(CONVERSATION_CONSTANTS.GROUPS.YESTERDAY)).toBe(2);
      expect(getGroupPriority(CONVERSATION_CONSTANTS.GROUPS.EARLIER)).toBe(3);
      expect(getGroupPriority('unknown')).toBe(999);
    });
  });
});

describe('Conversation Utils - Grouping', () => {
  const now = dayjs();
  const conversations: Conversation[] = [
    createMockConversation('today1', 'Today 1', now.valueOf()),
    createMockConversation('today2', 'Today 2', now.subtract(2, 'hours').valueOf()),
    createMockConversation('yesterday1', 'Yesterday 1', now.subtract(1, 'day').valueOf()),
    createMockConversation('earlier1', 'Earlier 1', now.subtract(7, 'days').valueOf()),
  ];

  describe('groupConversationsByDate', () => {
    it('should group conversations by date correctly', () => {
      const groups = groupConversationsByDate(conversations);
      
      expect(groups).toHaveLength(3);
      expect(groups[0].key).toBe(CONVERSATION_CONSTANTS.GROUPS.TODAY);
      expect(groups[1].key).toBe(CONVERSATION_CONSTANTS.GROUPS.YESTERDAY);
      expect(groups[2].key).toBe(CONVERSATION_CONSTANTS.GROUPS.EARLIER);
    });

    it('should sort conversations within groups by time descending', () => {
      const groups = groupConversationsByDate(conversations);
      const todayGroup = groups.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.TODAY);
      
      expect(todayGroup?.conversations[0].key).toBe('today1'); // more recent
      expect(todayGroup?.conversations[1].key).toBe('today2'); // less recent
    });

    it('should hide empty groups by default', () => {
      const conversationsWithoutYesterday = conversations.filter(c => c.key !== 'yesterday1');
      const groups = groupConversationsByDate(conversationsWithoutYesterday);
      
      expect(groups.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.YESTERDAY)).toBeUndefined();
    });

    it('should show empty groups when hideEmptyGroups is false', () => {
      const conversationsWithoutYesterday = conversations.filter(c => c.key !== 'yesterday1');
      const groups = groupConversationsByDate(conversationsWithoutYesterday, { hideEmptyGroups: false });
      
      const yesterdayGroup = groups.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.YESTERDAY);
      expect(yesterdayGroup).toBeDefined();
      expect(yesterdayGroup?.conversations).toHaveLength(0);
    });

    it('should include group counts when requested', () => {
      const groups = groupConversationsByDate(conversations, { includeGroupCounts: true });
      const todayGroup = groups.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.TODAY);
      
      expect(todayGroup?.title).toBe('今天 (2)');
    });
  });

  describe('processConversationsWithGrouping', () => {
    it('should process conversations with default options', () => {
      const groups = processConversationsWithGrouping(conversations);
      
      expect(groups).toHaveLength(3);
      expect(groups[0].key).toBe(CONVERSATION_CONSTANTS.GROUPS.TODAY);
    });

    it('should sort within groups according to sortWithinGroups option', () => {
      const groups = processConversationsWithGrouping(conversations, { sortWithinGroups: 'title' });
      const todayGroup = groups.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.TODAY);
      
      expect(todayGroup?.conversations[0].label).toBe('Today 1');
      expect(todayGroup?.conversations[1].label).toBe('Today 2');
    });

    it('should respect custom group order', () => {
      const customOrder = [
        CONVERSATION_CONSTANTS.GROUPS.EARLIER,
        CONVERSATION_CONSTANTS.GROUPS.TODAY,
        CONVERSATION_CONSTANTS.GROUPS.YESTERDAY
      ];
      
      const groups = processConversationsWithGrouping(conversations, { customGroupOrder: customOrder });
      
      expect(groups[0].key).toBe(CONVERSATION_CONSTANTS.GROUPS.EARLIER);
      expect(groups[1].key).toBe(CONVERSATION_CONSTANTS.GROUPS.TODAY);
      expect(groups[2].key).toBe(CONVERSATION_CONSTANTS.GROUPS.YESTERDAY);
    });
  });
});

describe('Conversation Utils - Group Operations', () => {
  const mockGroups: ConversationGroup[] = [
    {
      key: CONVERSATION_CONSTANTS.GROUPS.TODAY,
      title: '今天',
      conversations: [createMockConversation('1', 'Conv 1', Date.now())],
      timestamp: Date.now()
    },
    {
      key: CONVERSATION_CONSTANTS.GROUPS.YESTERDAY,
      title: '昨天',
      conversations: [],
      timestamp: 0
    },
    {
      key: CONVERSATION_CONSTANTS.GROUPS.EARLIER,
      title: '更早',
      conversations: [
        createMockConversation('2', 'Conv 2', Date.now() - 86400000),
        createMockConversation('3', 'Conv 3', Date.now() - 172800000)
      ],
      timestamp: Date.now() - 86400000
    }
  ];

  describe('isGroupEmpty', () => {
    it('should correctly identify empty groups', () => {
      expect(isGroupEmpty(mockGroups[0])).toBe(false);
      expect(isGroupEmpty(mockGroups[1])).toBe(true);
      expect(isGroupEmpty(mockGroups[2])).toBe(false);
    });
  });

  describe('filterEmptyGroups', () => {
    it('should filter out empty groups', () => {
      const filtered = filterEmptyGroups(mockGroups);
      expect(filtered).toHaveLength(2);
      expect(filtered.find(g => g.key === CONVERSATION_CONSTANTS.GROUPS.YESTERDAY)).toBeUndefined();
    });
  });

  describe('getGroupStats', () => {
    it('should return correct group statistics', () => {
      const stats = getGroupStats(mockGroups);
      
      expect(stats.totalGroups).toBe(3);
      expect(stats.totalConversations).toBe(3);
      expect(stats.emptyGroups).toBe(1);
      expect(stats.groupCounts[CONVERSATION_CONSTANTS.GROUPS.TODAY]).toBe(1);
      expect(stats.groupCounts[CONVERSATION_CONSTANTS.GROUPS.YESTERDAY]).toBe(0);
      expect(stats.groupCounts[CONVERSATION_CONSTANTS.GROUPS.EARLIER]).toBe(2);
    });
  });

  describe('getFlattenedConversations', () => {
    it('should return flattened conversations in correct order', () => {
      const flattened = getFlattenedConversations(mockGroups);
      
      expect(flattened).toHaveLength(3);
      expect(flattened[0].key).toBe('1'); // from TODAY group
      expect(flattened[1].key).toBe('2'); // from EARLIER group (first)
      expect(flattened[2].key).toBe('3'); // from EARLIER group (second)
    });
  });

  describe('regroupConversations', () => {
    it('should regroup conversations correctly', () => {
      const regrouped = regroupConversations(mockGroups);
      
      expect(regrouped).toHaveLength(2); // empty groups should be filtered out
      expect(regrouped[0].key).toBe(CONVERSATION_CONSTANTS.GROUPS.TODAY);
      expect(regrouped[1].key).toBe(CONVERSATION_CONSTANTS.GROUPS.EARLIER);
    });
  });
});