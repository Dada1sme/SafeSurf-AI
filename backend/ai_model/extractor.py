import ssl
import socket
import certifi
import requests
import ipaddress
import urllib.parse
import urlunshort3
import whois
import csv

from datetime import datetime

from bs4 import BeautifulSoup

class FeatureExtractor:
    """
    @class Feature
    @brief url에 대하여 특징을 추출하는 클래스
    """
    def __init__(self):
        self.timeout    = 5
        self.url        = None
        self.domain     = None
        self.hostname   = None
        self.port       = None
        self.scheme     = None
        self.response   = None
        self.html       = None

    def run(self, url: str):
        raw_url = url.strip()
        parsed = urllib.parse.urlparse(raw_url)
        candidates = [raw_url]
        if not parsed.scheme:
            candidates = [f"https://{raw_url}", f"http://{raw_url}"]

        selected_parse = None
        for candidate in candidates:
            parsed_candidate = urllib.parse.urlparse(candidate)
            if parsed_candidate.hostname:
                selected_parse = parsed_candidate
                self.url = candidate
                break

        if not selected_parse:
            print(f"Invalid URL : {url}")
            return None

        self.domain = selected_parse.netloc
        self.hostname = selected_parse.hostname
        self.scheme = selected_parse.scheme
        self.port = selected_parse.port if selected_parse.port else (443 if self.scheme == "https" else 80)

        # DNS resolution check before making the request
        try:
            socket.gethostbyname(self.hostname)
        except socket.gaierror:
            print(f"{url} DNS resolution failed.")
            return None

        try:
            self.response   = requests.get(url=self.url, timeout=self.timeout)
            self.html       = self.response.text
        except Exception as e:
            if self.scheme == "https":
                http_parse = selected_parse._replace(scheme="http", netloc=self.domain)
                http_url = urllib.parse.urlunparse(http_parse)
                try:
                    self.scheme = "http"
                    self.port = selected_parse.port if selected_parse.port else 80
                    self.url = http_url
                    self.response = requests.get(url=http_url, timeout=self.timeout)
                    self.html = self.response.text
                except Exception as inner_e:
                    print(f"{url} Connection Error : {inner_e}")
                    self.html = None
                    return None
            else:
                print(f"{url} Connection Error : {e}")
                self.html = None
                return None

        return [
            self.having_ip_address(),
            self.url_length(),
            self.shortening_service(),
            self.count_at_symbol(),
            self.count_double_slash(),
            self.count_hyphens_in_domain(),
            self.having_multi_sub_domains(),
            self.non_verified_https(),
            self.using_external_favicon(),
            self.using_non_standard_port(),
            self.https_token(),
            self.domain_age(),
            self.request_url(),
            self.check_blacklist(),
            self.count_redirects()
        ]

    def having_ip_address(self):
        """
        @brief
        url의 hostname이 IP 주소 체계인지 검사하는 함수입니다.
        정상 : hostname이 IP 주소 체계가 아닌 경우
        악성 : hostname이 IP 주소 체계인 경우
        @return 정상이면 1, 악성이면 -1
        """
        try:
            ipaddress.ip_address(address=self.hostname)
            return -1
        except ValueError:
            return 1

    def url_length(self):
        """
        @brief
        url의 길이를 검사하는 함수입니다.
        정상 : url의 길이가 54미만일 경우
        의심 : url의 길이가 54이상이며 75이하일 경우
        악성 : url의 길이가 75초과일 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        return 1 if len(self.url) < 54 else (0 if 54 <= len(self.url) and len(self.url) <= 75 else -1)
    
    def shortening_service(self):
        """
        @breif
        단축 url 서비스를 사용하는 지 검사하는 함수입니다.
        정상 : 단축 url 서비스를 사용하지 않는 경우
        악성 : 단축 url 서비스를 사용하는 경우
        @return 정상이면 1, 악성이면 -1
        """
        try: 
            tiny_url    = urlunshort3.UrlUnshortener()
            return -1 if tiny_url.is_shortened(self.url) else 1
        except:
            return -1
        
    def count_at_symbol(self):
        """
        @brief
        '@' 심볼의 등장 횟수를 반환하는 함수입니다.
        @return int: '@' 심볼 등장 횟수
        """
        return self.url.count("@")
    
    def count_double_slash(self):
        """
        @brief
        8번째 인덱스 이후에서 등장하는 '//' 쌍의 개수를 반환하는 함수입니다.
        (스킴 부분 제외)
        """
        return self.url[8:].count("//")
    
    def count_hyphens_in_domain(self):
        """
        @brief
        도메인에 등장하는 '-' 하이픈 수를 반환하는 함수입니다.
        @return int: '-' 등장 횟수
        """
        return self.domain.count("-")
    
    def having_multi_sub_domains(self):
        """
        @breif
        sub domain의 갯수를 검사하는 함수입니다.
        정상 : sub domain의 개수가 1개 이하일 경우
        의심 : sub domain의 개수가 2개일 경우
        악성 : sub domain의 개수가 3개 이상일 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        subdomain_count = len(self.domain.split(".")) - 2
        return 1 if subdomain_count <= 1 else (0 if subdomain_count == 2 else -1)
    
    def non_verified_https(self):
        """
        @brief
        HTTPS의 사용 여부와 인증서를 검사하는 함수입니다.
        정상 : 인증서의 발급자가 신뢰할 수 있으며 유효기간이 1년이상인 경우
        의심 : 인증서의 발급자가 신뢰할 수 없는 경우
        악성 : HTTPS를 미사용하는 경우
        @param url 검사할 url
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        if self.scheme != "https":
            return 0

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        sock.connect((self.hostname, self.port))
        context = ssl.create_default_context(cafile=certifi.where())
        try:
            wrapped = context.wrap_socket(sock, server_hostname=self.hostname)
            wrapped.close()
            return 1
        except ssl.SSLCertVerificationError as e:
            return 0
        except ssl.SSLError:
            return -1
        finally:
            sock.close()
        
    def using_external_favicon(self):
        """
        @brief
        favicon의 로드 경로를 검사하는 함수입니다.
        정상 : 같은 도메인에서 favicon 로드하는 경우
        의심 : favicon이 없는 경우
        악성 : 외부에서 favicon 로드하는 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        soup = BeautifulSoup(self.html, 'html.parser')
        favicon_link = soup.find('link', rel='icon') or soup.find('link', rel='shortcut icon')
        if favicon_link is not None:
            favicon_url = favicon_link.get('href', '')
            return 1 if favicon_url.startswith("/") or self.hostname in favicon_url else -1
        else:
            return 0
        
    def using_non_standard_port(self):
        """
        @brief
        표준 포트(80, 443, 8080)를 검사하는 함수입니다.
        정상 : 일반적인 포트를 사용하는 경우
        악성 : 일반적이지 않은 포트를 사용하는 경우
        @return 정상이면 1, 악성이면 -1
        """
        return 1 if self.port in [80, 443, 8080] else -1
    
    def https_token(self):
        """
        @brief
        URL의 도메인 부분에서 https를 사용하는 지 검사하는 함수입니다.
        정상 : 도메인 부분에서 https를 사용하지 않는 경우
        악성 : 도메인 부분에서 https를 사용하는 경우
        @return 정상이면 1, 악성이면 -1
        """
        return -1 if "https" in self.domain.lower() else 1
    
    def domain_age(self):
        """
        @brief
        도메인의 수명을 검사하는 함수입니다.
        정상 : 도메인의 나이가 1년 이상인 경우
        의심 : 도메인의 나이가 1년 미만이며 6개월 이상인 경우
        악성 : 도메인의 나이가 6개월 미만인 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        try:
            domain_info = whois.whois(self.hostname)
            creation_date = domain_info.creation_date
            expiration_date = domain_info.expiration_date

          # 일부 도메인은 날짜가 리스트로 반환됨
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]

            if not creation_date or not expiration_date:
                return -1

            age_days = (expiration_date - creation_date).days
            return 1 if age_days >= 365 else (0 if 180 <= age_days < 365 else -1)
        except Exception as e:
            return -1
    
    def request_url(self):
        """
        @brief
        도메인에 외부 주소가 포함되는 지 검사하는 함수입니다.
        정상 : 도메인에 외부 주소가 포함되지 않는 경우
        의심 : 도메인에 외부 주소가 포함되는 경우
        악성 : 도메인에 외부 주소가 포함되는 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        soup = BeautifulSoup(self.html, 'html.parser')
        tags = soup.find_all(['img', 'script', 'link'])

        total = len(tags)
        if total == 0:
            return 1

        internal = 0
        for tag in tags:
            attr = tag.get('src') or tag.get('href')
            if attr:
                if self.hostname in attr or attr.startswith('/') or attr.startswith('.'):
                    internal += 1

        ratio = internal / total
        return 1 if ratio >= 0.61 else (0 if 0.31 <= ratio <= 0.6 else -1)
    
    def check_blacklist(self, blacklist_path="blacklist.csv"):
        """
        @brief
        도메인이 블랙리스트에 포함되는 지 검사하는 함수입니다.
        정상 : 도메인이 블랙리스트에 포함되지 않는 경우
        악성 : 도메인이 블랙리스트에 포함되는 경우
        @return 정상이면 1, 악성이면 -1
        """
        try:
            with open(blacklist_path, newline='') as f:
                reader = csv.reader(f)
                for row in reader:
                    if self.domain in row or self.url in row:
                        return -1
            return 1
        except:
            return 1
        
    def count_redirects(self):
        """
        @brief
        도메인에 리다이렉트가 포함되는 지 검사하는 함수입니다.
        정상 : 도메인에 리다이렉트가 1개 이하 포함되는 경우
        의심 : 도메인에 리다이렉트가 2, 3개 포함되는 경우
        악성 : 도메인에 리다이렉트가 4개 이상 포함되는 경우
        @return 정상이면 1, 의심이면 0, 악성이면 -1
        """
        try:
            redirects = len(self.response.history)
            return 1 if redirects <= 1 else (0 if redirects <= 3 else -1)
        except:
            return -1
