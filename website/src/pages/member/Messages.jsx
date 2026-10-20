import { PageHeader } from '../../components/common/Layout';
import ChatPanel from '../../components/common/ChatPanel';

export default function Messages({ subtitle = 'Chat with your coach or nutrition consultant.' }) {
  return (
    <>
      <PageHeader title="Messages" subtitle={subtitle} />
      <ChatPanel />
    </>
  );
}
