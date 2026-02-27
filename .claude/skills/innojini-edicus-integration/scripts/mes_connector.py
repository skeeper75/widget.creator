"""
MES-Edicus Link 연동 커넥터
MES에서 Edicus Link로 상태/배송 정보를 전송하는 클라이언트

Usage:
    from mes_connector import EdicusLinkConnector
    
    connector = EdicusLinkConnector(api_key="mes-api-key", base_url="https://...")
    connector.update_status(edicus_order_id="100023", mes_order_id="M2511290001", status="PRODUCING")
    connector.update_shipping(edicus_order_id="100023", shipping_info={...})
"""

import requests
from typing import Optional, Dict, List, Any
from datetime import datetime
from dataclasses import dataclass
from enum import Enum


class OrderStatus(Enum):
    """주문 상태 코드"""
    RECEIVED = "RECEIVED"           # 주문접수
    CONFIRMED = "CONFIRMED"         # 주문확정
    FILE_READY = "FILE_READY"       # 파일준비완료
    PRODUCING = "PRODUCING"         # 생산중
    PRODUCED = "PRODUCED"           # 생산완료
    PACKING = "PACKING"             # 포장중
    SHIPPED = "SHIPPED"             # 발송완료
    DELIVERED = "DELIVERED"         # 배송완료
    CANCELED = "CANCELED"           # 취소
    HOLD = "HOLD"                   # 보류


STATUS_NAMES = {
    OrderStatus.RECEIVED: "주문접수",
    OrderStatus.CONFIRMED: "주문확정",
    OrderStatus.FILE_READY: "파일준비완료",
    OrderStatus.PRODUCING: "생산중",
    OrderStatus.PRODUCED: "생산완료",
    OrderStatus.PACKING: "포장중",
    OrderStatus.SHIPPED: "발송완료",
    OrderStatus.DELIVERED: "배송완료",
    OrderStatus.CANCELED: "취소",
    OrderStatus.HOLD: "보류",
}


class CarrierCode(Enum):
    """택배사 코드"""
    CJ = "CJ"           # CJ대한통운
    HANJIN = "HANJIN"   # 한진택배
    LOTTE = "LOTTE"     # 롯데택배
    LOGEN = "LOGEN"     # 로젠택배
    POST = "POST"       # 우체국택배


CARRIER_NAMES = {
    CarrierCode.CJ: "CJ대한통운",
    CarrierCode.HANJIN: "한진택배",
    CarrierCode.LOTTE: "롯데택배",
    CarrierCode.LOGEN: "로젠택배",
    CarrierCode.POST: "우체국택배",
}

CARRIER_TRACKING_URLS = {
    CarrierCode.CJ: "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=",
    CarrierCode.HANJIN: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnum=",
    CarrierCode.LOTTE: "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=",
    CarrierCode.LOGEN: "https://www.ilogen.com/web/delivery/invoice_traces498?slipno=",
    CarrierCode.POST: "https://service.epost.go.kr/trace.RetrieveDomRi498Trace.postal?sid1=",
}


@dataclass
class ShippingInfo:
    """배송 정보"""
    carrier_code: CarrierCode
    tracking_number: str
    shipped_at: datetime
    estimated_delivery: Optional[str] = None
    
    @property
    def carrier(self) -> str:
        return CARRIER_NAMES[self.carrier_code]
    
    @property
    def tracking_url(self) -> str:
        return f"{CARRIER_TRACKING_URLS[self.carrier_code]}{self.tracking_number}"
    
    def to_dict(self) -> Dict:
        return {
            "carrier": self.carrier,
            "carrier_code": self.carrier_code.value,
            "tracking_number": self.tracking_number,
            "tracking_url": self.tracking_url,
            "shipped_at": self.shipped_at.isoformat(),
            "estimated_delivery": self.estimated_delivery
        }


class EdicusLinkConnector:
    """Edicus Link 연동 커넥터 (MES → Edicus)"""
    
    def __init__(self, api_key: str, base_url: str):
        """
        Args:
            api_key: MES API 키 (Edicus Link에서 발급)
            base_url: Edicus Link API 베이스 URL
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "X-MES-API-Key": api_key,
            "Content-Type": "application/json"
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """API 요청 헬퍼"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        
        data = response.json()
        if not data.get("success", True):
            raise EdicusLinkError(
                data.get("error_code", "UNKNOWN"),
                data.get("message", "Unknown error")
            )
        
        return data
    
    def update_status(self, edicus_order_id: str, mes_order_id: str,
                     status: OrderStatus, memo: str = "") -> Dict:
        """
        주문 상태 업데이트
        
        Args:
            edicus_order_id: 에디쿠스 주문 ID
            mes_order_id: MES 주문번호
            status: 상태 코드
            memo: 메모 (선택)
        """
        return self._request(
            "POST",
            f"/api/v1/orders/{edicus_order_id}/status",
            json={
                "mes_order_id": mes_order_id,
                "status": status.value,
                "status_name": STATUS_NAMES[status],
                "updated_at": datetime.now().isoformat(),
                "memo": memo
            }
        )
    
    def update_shipping(self, edicus_order_id: str, mes_order_id: str,
                       shipping_info: ShippingInfo,
                       packages: Optional[List[Dict]] = None) -> Dict:
        """
        배송 정보 업데이트
        
        Args:
            edicus_order_id: 에디쿠스 주문 ID
            mes_order_id: MES 주문번호
            shipping_info: 배송 정보
            packages: 박스별 정보 (선택)
        """
        data = {
            "mes_order_id": mes_order_id,
            "shipping_info": shipping_info.to_dict()
        }
        if packages:
            data["packages"] = packages
        
        return self._request(
            "POST",
            f"/api/v1/orders/{edicus_order_id}/shipping",
            json=data
        )
    
    def ship_order(self, edicus_order_id: str, mes_order_id: str,
                  carrier_code: CarrierCode, tracking_number: str,
                  estimated_delivery: Optional[str] = None) -> Dict:
        """
        출하 처리 (상태 업데이트 + 배송 정보 전송)
        
        Args:
            edicus_order_id: 에디쿠스 주문 ID
            mes_order_id: MES 주문번호
            carrier_code: 택배사 코드
            tracking_number: 운송장 번호
            estimated_delivery: 예상 배송일 (YYYY-MM-DD)
        """
        shipping_info = ShippingInfo(
            carrier_code=carrier_code,
            tracking_number=tracking_number,
            shipped_at=datetime.now(),
            estimated_delivery=estimated_delivery
        )
        
        # 1. 배송 정보 전송
        self.update_shipping(edicus_order_id, mes_order_id, shipping_info)
        
        # 2. 상태 업데이트
        return self.update_status(
            edicus_order_id, mes_order_id, 
            OrderStatus.SHIPPED, 
            f"운송장: {tracking_number}"
        )


class MESOrderReceiver:
    """MES 주문 수신 핸들러 (Edicus → MES)"""
    
    @staticmethod
    def handle_order(order_data: Dict) -> Dict:
        """
        Edicus Link에서 전송된 주문 처리
        
        Args:
            order_data: Edicus Link에서 전송된 주문 데이터
        
        Returns:
            처리 결과 (mes_order_id 포함)
        """
        # TODO: 실제 MES 로직 구현
        
        # 1. 중복 체크
        edicus_order_id = order_data["edicus_order_id"]
        # if db.exists(edicus_order_id): raise DuplicateOrderError()
        
        # 2. MES 주문번호 생성
        mes_order_id = MESOrderReceiver._generate_order_id()
        
        # 3. 품목 코드 변환
        for item in order_data.get("items", []):
            edicus_code = item.get("edicus_product_code")
            mes_code = item.get("mes_product_code")
            # 매핑 검증/변환 로직
        
        # 4. 주문 저장
        # db.save_order(...)
        
        return {
            "success": True,
            "mes_order_id": mes_order_id,
            "received_at": datetime.now().isoformat(),
            "message": "주문 접수 완료"
        }
    
    @staticmethod
    def _generate_order_id() -> str:
        """MES 주문번호 생성 (M + YYMM + 일련번호)"""
        now = datetime.now()
        prefix = f"M{now.strftime('%y%m')}"
        # TODO: 실제로는 DB에서 시퀀스 조회
        seq = "0001"
        return f"{prefix}{seq}"


class EdicusLinkError(Exception):
    """Edicus Link API 에러"""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {message}")


# ========== 사용 예시 ==========

if __name__ == "__main__":
    # 커넥터 초기화
    connector = EdicusLinkConnector(
        api_key="mes-api-key",
        base_url="https://edicus-link.example.com"
    )
    
    # 상태 업데이트 예시
    try:
        result = connector.update_status(
            edicus_order_id="100023",
            mes_order_id="M2511290001",
            status=OrderStatus.PRODUCING,
            memo="인쇄 진행중"
        )
        print(f"상태 업데이트 성공: {result}")
    except EdicusLinkError as e:
        print(f"에러: {e}")
    
    # 출하 처리 예시
    try:
        result = connector.ship_order(
            edicus_order_id="100023",
            mes_order_id="M2511290001",
            carrier_code=CarrierCode.CJ,
            tracking_number="123456789012",
            estimated_delivery="2025-12-02"
        )
        print(f"출하 처리 성공: {result}")
    except EdicusLinkError as e:
        print(f"에러: {e}")
