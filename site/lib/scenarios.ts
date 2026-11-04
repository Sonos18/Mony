// Các tình huống luyện nói: Mony nhập một vai, người học cần đạt ba mục tiêu, cuối buổi Mony chấm từng mục tiêu.
// Trang lấy danh sách qua GET /api/talk, nên thêm tình huống chỉ cần sửa file này.
export type Scenario = {
  id: string;
  title: string; // tiếng Việt, hiện trên nút chọn
  role: string; // vai Mony đóng, tiếng Anh, gửi cho model
  setting: string; // bối cảnh, tiếng Anh, gửi cho model
  opener: { en: string; vi: string }; // câu mở đầu, không cần gọi model
  goals: string[]; // tiếng Việt, hiện cho người học và gửi cho model
};

export const SCENARIOS: Scenario[] = [
  {
    id: "free",
    title: "Nói chuyện tự do",
    role: "yourself, Mony, a roommate who loves chatting in English",
    setting: "Your small rented room in the evening. Chat about the learner's day, work, food, hobbies, films or hometown.",
    opener: { en: "Hey, come in. Sit anywhere. So, how was your day?", vi: "Vào đi, ngồi đâu cũng được. Hôm nay của bạn thế nào?" },
    goals: ["Kể được một việc bạn làm hôm nay", "Hỏi lại Mony ít nhất một câu", "Nói được một câu dài hơn 10 từ"],
  },
  {
    id: "intro",
    title: "Làm quen, giới thiệu bản thân",
    role: "a friendly foreign coworker meeting the learner for the first time at a coffee break",
    setting: "First day at a new office in Ho Chi Minh City, by the coffee machine.",
    opener: { en: "Hi! I don't think we've met. I'm Alex, I just joined the design team. And you?", vi: "Chào! Hình như mình chưa gặp nhau. Mình là Alex, mới vào nhóm thiết kế. Còn bạn?" },
    goals: ["Giới thiệu tên và công việc hoặc việc học", "Kể một sở thích của bạn", "Hỏi lại người kia một câu về họ"],
  },
  {
    id: "interview",
    title: "Phỏng vấn xin việc",
    role: "a polite but serious HR interviewer at an international company",
    setting: "A first-round job interview for a position the learner wants. Ask one question at a time, follow up on vague answers.",
    opener: { en: "Good morning, thanks for coming in. To start, could you tell me a little about yourself?", vi: "Chào buổi sáng, cảm ơn bạn đã đến. Trước tiên, bạn giới thiệu một chút về bản thân nhé?" },
    goals: ["Giới thiệu kinh nghiệm hoặc việc học liên quan", "Nêu một điểm mạnh kèm ví dụ cụ thể", "Hỏi người phỏng vấn một câu về công việc"],
  },
  {
    id: "meeting",
    title: "Họp và báo cáo công việc",
    role: "the learner's foreign team lead in a short daily stand-up meeting",
    setting: "An online stand-up. Ask what they did yesterday, what they will do today and whether anything is blocking them.",
    opener: { en: "Morning! Let's keep it quick today. What did you work on yesterday?", vi: "Chào buổi sáng! Hôm nay họp nhanh nhé. Hôm qua bạn làm gì?" },
    goals: ["Báo cáo việc đã làm hôm qua", "Nói kế hoạch hôm nay", "Nêu một khó khăn và nhờ giúp đỡ"],
  },
  {
    id: "airport",
    title: "Làm thủ tục ở sân bay",
    role: "a check-in agent at an international airport counter",
    setting: "The learner is flying abroad. Ask for the passport, destination, bags, seat preference. Mention one small problem (the bag is 2 kg overweight).",
    opener: { en: "Good afternoon. Where are you flying to today? Can I see your passport, please?", vi: "Chào buổi chiều. Hôm nay bạn bay đi đâu? Cho tôi xem hộ chiếu nhé?" },
    goals: ["Nói điểm đến và đưa giấy tờ", "Chọn chỗ ngồi theo ý bạn", "Xử lý chuyện hành lý quá cân"],
  },
  {
    id: "hotel",
    title: "Khách sạn: đổi phòng bị ồn",
    role: "a hotel receptionist at the front desk, helpful but the hotel is almost full",
    setting: "The learner checked in last night and the room was very noisy. They come down to the front desk.",
    opener: { en: "Good morning! How can I help you today?", vi: "Chào buổi sáng! Tôi có thể giúp gì cho bạn?" },
    goals: ["Giải thích vấn đề của phòng một cách lịch sự", "Đề nghị đổi phòng", "Thoả thuận được một giải pháp"],
  },
  {
    id: "cafe",
    title: "Bán hàng cho khách nước ngoài",
    role: "a curious tourist from Australia visiting the learner's coffee shop in Vietnam for the first time",
    setting: "The learner works at the counter. The tourist does not know Vietnamese coffee, asks what is good, about sugar and ice, and the price.",
    opener: { en: "Hi there! I've never tried Vietnamese coffee. What would you recommend?", vi: "Chào bạn! Mình chưa thử cà phê Việt bao giờ. Bạn gợi ý món gì?" },
    goals: ["Giới thiệu một món và mô tả vị", "Hỏi khách về đường, đá hoặc cỡ ly", "Báo giá và chào khách"],
  },
];

export const scenarioOf = (id: unknown) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

// Phần gửi cho trang: không gửi role và setting
export const publicScenarios = () => SCENARIOS.map(({ id, title, opener, goals }) => ({ id, title, opener, goals }));
