// Dấu hiệu tin tuyển dụng lừa đảo đưa người sang trại. Giữ khớp với WARNINGS trong site/public/index.html.
export const WARNINGS: Array<[sign: string, monySays: string]> = [
  ["Lương cao bất thường, không cần kinh nghiệm, không cần bằng cấp.", "Hồi đó tôi cũng được hứa 30 triệu một tháng. Không ai trả 30 triệu cho người chưa biết làm gì cả."],
  ["Tuyển qua Telegram, Facebook hay Zalo cá nhân, không có tên công ty, địa chỉ hay hợp đồng rõ ràng.", "Người tuyển tôi chỉ có một cái nick Telegram. Sau đó nick đó biến mất."],
  ["Bao vé, bao ăn ở, làm việc ở nước ngoài hoặc \"sát biên giới\".", "Không ai bao vé cho người lạ mà không định lấy lại gấp mười."],
  ["Giục đi gấp, đi đường tắt, không qua cửa khẩu chính thức.", "Đường tắt là đường một chiều. Tôi biết vì tôi đã đứng ở đầu bên kia."],
  ["Đòi giữ hộ chiếu hay căn cước \"để làm thủ tục\".", "Giấy tờ bị giữ là bạn hết đường về. Tôi phải vay tiền để chuộc lại tấm căn cước của mình."],
  ["Mô tả việc mơ hồ: \"chăm sóc khách online\", \"nhập liệu\", \"marketing\", nhưng không nói làm cho ai.", "Chăm sóc khách ở trại nghĩa là nhắn tin lừa người ta chuyển tiền."],
  ["Dặn đừng kể với gia đình, bắt xóa tin nhắn.", "Việc tử tế không bao giờ cần giấu mẹ bạn."],
];

export function warningText(): string {
  const list = WARNINGS.map(([sign], i) => `${i + 1}. ${sign}`).join("\n");
  return `7 dấu hiệu "việc nhẹ lương cao" đưa người sang trại:\n\n${list}\n\nThấy từ hai dấu hiệu trở lên: đừng đi, kể với người nhà, và gọi công an 113 nếu có người đã bị đưa đi.`;
}
