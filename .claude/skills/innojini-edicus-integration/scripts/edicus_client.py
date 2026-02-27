"""
Edicus API Client
모션원 Edicus 플랫폼 연동을 위한 Python 클라이언트

Usage:
    from edicus_client import EdicusClient
    
    client = EdicusClient(api_key="your-api-key")
    token = client.get_user_token(uid="user123")
    projects = client.get_projects(uid="user123")
"""

import requests
from typing import Optional, Dict, List, Any
from datetime import datetime


class EdicusClient:
    """Edicus Server API 클라이언트"""
    
    BASE_URL = "https://api-dot-edicusbase.appspot.com"
    RESOURCE_URL = "https://resource-dot-edicusbase.appspot.com"
    
    def __init__(self, api_key: str):
        """
        Args:
            api_key: 모션원에서 발급받은 API 키
        """
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "edicus-api-key": api_key,
            "Content-Type": "application/json"
        })
    
    def _request(self, method: str, endpoint: str, uid: Optional[str] = None, 
                 **kwargs) -> Dict[str, Any]:
        """API 요청 헬퍼"""
        headers = kwargs.pop("headers", {})
        if uid:
            headers["edicus-uid"] = uid
        
        url = f"{self.BASE_URL}{endpoint}"
        response = self.session.request(method, url, headers=headers, **kwargs)
        
        data = response.json()
        if "err" in data:
            raise EdicusAPIError(data["err"])
        
        return data
    
    # ========== 인증 ==========
    
    def get_user_token(self, uid: str) -> str:
        """사용자 토큰 발급 (JWT, 1시간 유효)"""
        result = self._request("POST", "/api/auth/token", uid=uid)
        return result["token"]
    
    def get_staff_token(self, email: str, password: str) -> str:
        """스태프 토큰 발급"""
        headers = {
            "edicus-email": email,
            "edicus-pwd": password
        }
        result = self._request("POST", "/api/auth/staff/token", headers=headers)
        return result["token"]
    
    # ========== 프로젝트 ==========
    
    def get_projects(self, uid: str) -> List[Dict]:
        """프로젝트 목록 조회"""
        return self._request("GET", "/api/projects", uid=uid)
    
    def get_project(self, project_id: str, uid: str) -> Dict:
        """프로젝트 상세 조회"""
        return self._request("GET", f"/api/projects/{project_id}", uid=uid)
    
    def get_project_data(self, project_id: str, uid: str, 
                         include_doc: bool = False) -> Dict:
        """프로젝트 데이터 조회 (문서 포함 옵션)"""
        doc_param = "true" if include_doc else "false"
        return self._request("GET", 
                            f"/api/projects/{project_id}/data?doc={doc_param}", 
                            uid=uid)
    
    def delete_project(self, project_id: str, uid: str) -> Dict:
        """프로젝트 삭제 (주문된 것은 삭제 불가)"""
        return self._request("DELETE", f"/api/projects/{project_id}", uid=uid)
    
    def clone_project(self, project_id: str, uid: str, 
                      target_uid: Optional[str] = None) -> str:
        """프로젝트 복제 (동기)"""
        headers = {}
        if target_uid:
            headers["edicus-target-uid"] = target_uid
        result = self._request("POST", f"/api/projects/{project_id}/clone", 
                              uid=uid, headers=headers)
        return result["project_id"]
    
    def clone_project_async(self, project_id: str, uid: str,
                           callback_url: Optional[str] = None,
                           target_uid: Optional[str] = None) -> str:
        """프로젝트 복제 (비동기) - 대용량 프로젝트용"""
        headers = {}
        if target_uid:
            headers["edicus-target-uid"] = target_uid
        
        json_data = {}
        if callback_url:
            json_data["callback_url"] = callback_url
        
        result = self._request("POST", f"/api/projects/{project_id}/clone_async",
                              uid=uid, headers=headers, json=json_data)
        return result["project_id"]
    
    def get_project_owner(self, project_id: str) -> Optional[str]:
        """프로젝트 소유자 조회"""
        result = self._request("GET", f"/api/projects/{project_id}/owner")
        return result.get("owner")
    
    # ========== 미리보기 ==========
    
    def get_preview_urls(self, project_id: str) -> List[str]:
        """프로젝트 미리보기 썸네일 URL 목록"""
        result = self._request("GET", f"/api/projects/{project_id}/preview_urls")
        return result.get("urls", [])
    
    def get_multiple_preview_urls(self, project_ids: List[str]) -> List[Dict]:
        """복수 프로젝트 썸네일 일괄 조회 (최대 25개)"""
        result = self._request("POST", "/api/projects/preview_urls",
                              json={"project-ids": project_ids})
        return result.get("urls", [])
    
    # ========== 주문 ==========
    
    def can_order(self, project_id: str) -> Dict:
        """주문 가능 여부 확인"""
        return self._request("GET", f"/api/projects/{project_id}/order/can_order")
    
    def tentative_order(self, project_id: str, uid: str,
                       order_count: int, total_price: int,
                       partner_order_id: Optional[str] = None,
                       order_name: Optional[str] = None,
                       userdata_json: Optional[str] = None,
                       order_for_test: bool = False) -> Dict:
        """임시 주문 (취소 가능)"""
        data = {
            "order_count": order_count,
            "total_price": total_price,
            "order_for_test": order_for_test
        }
        if partner_order_id:
            data["partner_order_id"] = partner_order_id
        if order_name:
            data["order_name"] = order_name
        if userdata_json:
            data["userdata_json"] = userdata_json
        
        return self._request("POST", 
                            f"/api/projects/{project_id}/order/tentative",
                            uid=uid, json=data)
    
    def definitive_order(self, project_id: str, uid: str) -> Dict:
        """주문 확정 (렌더링 시작, 취소 불가)"""
        return self._request("POST", 
                            f"/api/projects/{project_id}/order/definitive",
                            uid=uid)
    
    def cancel_order(self, order_id: str, uid: str) -> Dict:
        """주문 취소 (ordering 상태에서만)"""
        return self._request("POST", f"/api/orders/{order_id}/cancel", uid=uid)
    
    def reset_rendering_status(self, order_id: str) -> Dict:
        """렌더링 상태 초기화 (재시도용)"""
        return self._request("PUT", 
                            f"/api/orders/{order_id}/status/reset_as_ordered")
    
    def query_orders_by_time(self, from_date: str, to_date: str,
                            status: Optional[str] = None,
                            partner_order_id: Optional[str] = None,
                            order_name: Optional[str] = None) -> List[Dict]:
        """기간별 주문 조회"""
        query = {"from": from_date, "to": to_date}
        if status:
            query["status"] = status
        if partner_order_id:
            query["partner_order_id"] = partner_order_id
        if order_name:
            query["order_name"] = order_name
        
        result = self._request("POST", "/api/order/query",
                              json={"by_time": query})
        return result.get("result", [])
    
    def query_order_by_id(self, order_id: str) -> List[Dict]:
        """주문 ID로 조회"""
        result = self._request("POST", "/api/order/query",
                              json={"by_order_id": {"order_id": order_id}})
        return result.get("result", [])
    
    def query_order_by_partner_id(self, partner_order_id: str) -> List[Dict]:
        """파트너 주문 ID로 조회 (MES 주문번호)"""
        result = self._request("POST", "/api/order/query",
                              json={"by_partner_order_id": 
                                   {"partner_order_id": partner_order_id}})
        return result.get("result", [])
    
    # ========== 폰트 ==========
    
    def get_font_groups(self) -> List[str]:
        """폰트 그룹 목록"""
        result = self._request("GET", "/api/font/group_id_list")
        return result.get("list", [])
    
    def get_fonts_by_group(self, group_id: str) -> List[Dict]:
        """그룹별 폰트 목록"""
        result = self._request("GET", f"/api/font/group/{group_id}/list")
        return result.get("list", [])


class EdicusResourceClient:
    """Edicus Resource API 클라이언트"""
    
    BASE_URL = "https://resource-dot-edicusbase.appspot.com"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "edicus-api-key": api_key,
            "Content-Type": "application/json"
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.BASE_URL}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        return response.json()
    
    def get_products(self) -> Dict:
        """전체 상품 목록"""
        return self._request("GET", "/resapi/product/list")
    
    def get_product(self, prod_code: str) -> Dict:
        """특정 상품 정보"""
        return self._request("GET", f"/resapi/product/{prod_code}")
    
    def issue_resource_token(self) -> str:
        """템플릿 등록용 토큰 발급"""
        result = self._request("GET", "/resapi/token")
        return result["token"]
    
    def query_resources(self, resource_type: str = "template",
                       visibilities: List[str] = None,
                       ps_codes: List[str] = None,
                       tags: List[str] = None,
                       limit: int = 30,
                       order: str = "asc") -> List[Dict]:
        """리소스 검색"""
        option = {
            "type": resource_type,
            "limit": limit,
            "order": order
        }
        if visibilities:
            option["visibilities"] = visibilities
        if ps_codes:
            option["psCodes"] = ps_codes
        if tags:
            option["tags"] = tags
        
        result = self._request("POST", "/resapi/query", json={"option": option})
        return result.get("items", [])


class EdicusAPIError(Exception):
    """Edicus API 에러"""
    def __init__(self, err_data: Dict):
        self.code = err_data.get("code", "UNKNOWN")
        self.message = err_data.get("message", "Unknown error")
        self.info = err_data.get("info", {})
        super().__init__(f"[{self.code}] {self.message}")


# ========== 사용 예시 ==========

if __name__ == "__main__":
    # 클라이언트 초기화
    client = EdicusClient(api_key="your-api-key")
    
    # 토큰 발급
    token = client.get_user_token(uid="user123")
    print(f"Token: {token[:50]}...")
    
    # 프로젝트 목록 조회
    projects = client.get_projects(uid="user123")
    print(f"Projects: {len(projects)}")
    
    # 주문 조회 (MES 연동 예시)
    orders = client.query_order_by_partner_id("M2511290001")
    for order in orders:
        print(f"Order: {order['id']} - {order['status']}")
