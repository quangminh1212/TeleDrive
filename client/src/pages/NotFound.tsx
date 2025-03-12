import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Xin lỗi, trang bạn đang tìm kiếm không tồn tại."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Quay lại trang chủ
        </Button>
      }
    />
  );
};

export default NotFound; 