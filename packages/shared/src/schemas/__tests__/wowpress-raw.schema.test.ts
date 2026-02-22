/**
 * Tests for WowPress raw JSON validation schemas.
 *
 * Validates that Zod schemas correctly parse and validate
 * raw WowPress API response structures from catalog data.
 */
import { describe, it, expect } from "vitest";
import {
  CoverInfoSchema,
  SizeInfoSchema,
  PaperInfoSchema,
  ColorInfoSchema,
  OrdQtySchema,
  PrsjobInfoSchema,
  AwkjobInfoSchema,
  DeliverInfoSchema,
  ProdInfoSchema,
} from "../wowpress-raw.schema.js";

describe("WowPress Raw JSON Schemas", () => {
  describe("CoverInfoSchema", () => {
    it("should validate a valid cover info entry", () => {
      const data = {
        covercd: 0,
        covername: "\uD1B5\uD569",
        pagelist: [
          {
            pagecd: 0,
            pagename: "\uC591\uBA74",
          },
        ],
        pagecnt: {
          min: null,
          max: null,
          interval: null,
        },
      };
      const result = CoverInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.covercd).toBe(0);
        expect(result.data.pagelist).toHaveLength(1);
      }
    });

    it("should validate cover info with page count constraints", () => {
      const data = {
        covercd: 1,
        covername: "\uD45C\uC9C0",
        pagelist: [
          { pagecd: 1, pagename: "\uC55E\uBA74" },
          { pagecd: 2, pagename: "\uB4B7\uBA74" },
        ],
        pagecnt: {
          min: 8,
          max: 200,
          interval: 4,
        },
      };
      const result = CoverInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject cover info without covercd", () => {
      const data = {
        covername: "\uD1B5\uD569",
        pagelist: [],
        pagecnt: { min: null, max: null, interval: null },
      };
      const result = CoverInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("SizeInfoSchema", () => {
    it("should validate a standard size list entry", () => {
      const data = {
        covercd: 0,
        sizelist: [
          {
            sizeno: 5498,
            sizename: "90x100",
            width: 90,
            height: 100,
            cutsize: 3,
            non_standard: false,
            req_width: null,
            req_height: null,
            req_paper: null,
            req_color: null,
            req_awkjob: null,
            rst_ordqty: null,
            rst_awkjob: null,
          },
        ],
      };
      const result = SizeInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sizelist[0].sizeno).toBe(5498);
        expect(result.data.sizelist[0].non_standard).toBe(false);
      }
    });

    it("should validate a non-standard size with req_width/req_height", () => {
      const data = {
        covercd: 0,
        sizelist: [
          {
            sizeno: 5493,
            sizename: "\uBE44\uADDC\uACA9",
            width: 90,
            height: 55,
            cutsize: 3,
            non_standard: true,
            req_width: {
              type: "input",
              unit: "\uAC00\uB85C(mm)",
              min: 30,
              max: 510,
              interval: 1,
            },
            req_height: {
              type: "input",
              unit: "\uC138\uB85C(mm)",
              min: 30,
              max: 760,
              interval: 1,
            },
            req_paper: null,
            req_color: null,
            req_awkjob: null,
            rst_ordqty: null,
            rst_awkjob: null,
          },
        ],
      };
      const result = SizeInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sizelist[0].non_standard).toBe(true);
        expect(result.data.sizelist[0].req_width).not.toBeNull();
      }
    });

    it("should reject size info without covercd", () => {
      const data = {
        sizelist: [],
      };
      const result = SizeInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("PaperInfoSchema", () => {
    it("should validate a valid paper info entry", () => {
      const data = {
        covercd: 0,
        paperlist: [
          {
            paperno: 22927,
            papername: "\uC544\uD2B8\uC9C0(\uBB34\uCF54\uD305) 80g",
            papergroup: "\uC544\uD2B8\uC9C0(\uBB34\uCF54\uD305)",
            pgram: 80,
            req_width: null,
            req_height: null,
            req_awkjob: null,
            rst_ordqty: null,
            rst_prsjob: [
              {
                jobno: 3230,
                jobname: "\uB3C5\uD310UV\uC778\uC1C4",
              },
            ],
            rst_awkjob: null,
          },
        ],
        ncr: null,
      };
      const result = PaperInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paperlist[0].paperno).toBe(22927);
        expect(result.data.paperlist[0].rst_prsjob).toHaveLength(1);
      }
    });

    it("should validate paper with null pGram", () => {
      const data = {
        covercd: 0,
        paperlist: [
          {
            paperno: 30000,
            papername: "Special Paper",
            papergroup: "Special",
            pgram: null,
            req_width: null,
            req_height: null,
            req_awkjob: null,
            rst_ordqty: null,
            rst_prsjob: null,
            rst_awkjob: null,
          },
        ],
        ncr: null,
      };
      const result = PaperInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("ColorInfoSchema", () => {
    it("should validate a valid color info entry", () => {
      const data = {
        covercd: 0,
        pagelist: [
          {
            pagecd: 0,
            type: "radio",
            colorlist: [
              {
                colorno: 302,
                colorname: "\uB2E8\uBA74 \uCE7C\uB77C",
                pdfpage: 1,
                req_prsjob: [
                  {
                    jobpresetno: 3110,
                    jobno: 3110,
                    jobname: "\uC635\uC14B\uC778\uC1C4",
                  },
                ],
                req_awkjob: null,
                rst_prsjob: null,
                rst_awkjob: null,
                rst_opt: null,
              },
            ],
            addtype: null,
            coloraddlist: null,
          },
        ],
      };
      const result = ColorInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagelist[0].colorlist[0].colorno).toBe(302);
      }
    });

    it("should validate color info with additional color list", () => {
      const data = {
        covercd: 0,
        pagelist: [
          {
            pagecd: 0,
            type: "radio",
            colorlist: [
              {
                colorno: 302,
                colorname: "Color",
                pdfpage: 1,
                req_prsjob: null,
                req_awkjob: null,
                rst_prsjob: null,
                rst_awkjob: null,
                rst_opt: null,
              },
            ],
            addtype: "checkbox",
            coloraddlist: [
              {
                colornoadd: 400,
                colorname: "Extra Color",
                pdfpage: 2,
                req_prsjob: null,
                req_awkjob: null,
                rst_awkjob: null,
              },
            ],
          },
        ],
      };
      const result = ColorInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("OrdQtySchema", () => {
    it("should validate a select-type order quantity", () => {
      const data = {
        type: "select",
        jobpresetno: null,
        sizeno: null,
        paperno: null,
        optno: null,
        colorno: null,
        colornoadd: null,
        ordqtymin: 500,
        ordqtymax: 100000,
        ordqtyinterval: null,
        ordqtylist: [
          500, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 14000,
          15000, 16000, 18000, 20000, 30000, 40000, 50000, 60000, 70000, 80000,
          90000, 100000,
        ],
      };
      const result = OrdQtySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("select");
        expect(result.data.ordqtylist).toHaveLength(23);
        expect(result.data.ordqtymin).toBe(500);
      }
    });

    it("should validate an input-type order quantity", () => {
      const data = {
        type: "input",
        jobpresetno: 3110,
        sizeno: 5498,
        paperno: 22927,
        optno: null,
        colorno: 302,
        colornoadd: null,
        ordqtymin: 100,
        ordqtymax: 50000,
        ordqtyinterval: 100,
        ordqtylist: null,
      };
      const result = OrdQtySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("input");
        expect(result.data.ordqtyinterval).toBe(100);
      }
    });

    it("should reject order quantity without type", () => {
      const data = {
        ordqtymin: 500,
        ordqtymax: 100000,
      };
      const result = OrdQtySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("PrsjobInfoSchema", () => {
    it("should validate a valid print job info entry", () => {
      const data = {
        jobpresetno: 3110,
        jobpreset: "\uC635\uC14B\uC778\uC1C4",
        prsjoblist: [
          {
            covercd: 0,
            jobno: 3110,
            jobname: "\uD569\uD310\uC635\uC14B\uC778\uC1C4",
            unit: "\uB9E4",
            req_color: [
              {
                colorno: 302,
                colorname: "\uB2E8\uBA74 \uCE7C\uB77C",
              },
            ],
            rst_paper: null,
            rst_awkjob: null,
          },
        ],
      };
      const result = PrsjobInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobpresetno).toBe(3110);
        expect(result.data.prsjoblist).toHaveLength(1);
      }
    });
  });

  describe("AwkjobInfoSchema", () => {
    it("should validate a valid post-process info entry", () => {
      const data = {
        covercd: 0,
        type: "checkbox",
        jobgrouplist: [
          {
            jobgroupno: 36500,
            jobgroup: "\uCE7C\uC120\uBC29\uD5A5",
            type: "select",
            displayloc: "awkjob",
            awkjoblist: [
              {
                jobno: 36510,
                jobname: "\uCE7C\uC120 \uAC00\uB85C\uBC29\uD5A5",
                namestep1: "\uCE7C\uC120\uBC29\uD5A5",
                namestep2: "\uAC00\uB85C\uBC29\uD5A5",
                unit: "\uB9E4",
                unitlist: null,
                ck_page: null,
                req_joboption: null,
                req_jobsize: null,
                req_jobqty: null,
                req_awkjob: null,
                rst_jobqty: null,
                rst_cutcnt: null,
                rst_size: null,
                rst_paper: null,
                rst_color: null,
                rst_awkjob: null,
              },
            ],
          },
        ],
      };
      const result = AwkjobInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobgrouplist).toHaveLength(1);
        expect(result.data.jobgrouplist[0].awkjoblist[0].jobno).toBe(36510);
      }
    });
  });

  describe("DeliverInfoSchema", () => {
    it("should validate a valid delivery info structure", () => {
      const data = {
        dlvyfree: [
          {
            usrkd: 31,
            usrkdname: "Family",
            mincost: 50000,
          },
          {
            usrkd: 32,
            usrkdname: "Silver",
            mincost: 40000,
          },
        ],
        dlvymcdlist: [
          {
            dlvymcd: 0,
            dlvymcdname: "Standard Delivery",
            dlvycost: 3000,
          },
        ],
      };
      const result = DeliverInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dlvyfree).toHaveLength(2);
      }
    });

    it("should validate delivery info with null usrkdname", () => {
      const data = {
        dlvyfree: [
          {
            usrkd: 39,
            usrkdname: null,
            mincost: 20000,
          },
        ],
        dlvymcdlist: [],
      };
      const result = DeliverInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("ProdInfoSchema", () => {
    it("should validate a complete product info structure", () => {
      const data = {
        timestamp: "2025-10-15 03:05:19",
        prodno: 40007,
        prodname: "\uAC00\uC131\uBE44\uC2A4\uD2F0\uCEE4(\uC0AC\uAC01)",
        seltype: "M",
        pjoin: 0,
        unit: "\uB9E4",
        ctptime: "null",
        dlvyprepay: true,
        dlvygrpno: 1,
        dlvygrpname: "\uBA85\uD568,\uC2A4\uD2F0\uCEE4 \uBB36\uC74C",
        filetype: "AI,EPS,JPG,PNG,CDR,PSD,SIT,ZIP,ALZ,PDF",
        coverinfo: [
          {
            covercd: 0,
            covername: "\uD1B5\uD569",
            pagelist: [{ pagecd: 0, pagename: "\uC591\uBA74" }],
            pagecnt: { min: null, max: null, interval: null },
          },
        ],
        ordqty: [
          {
            type: "select",
            jobpresetno: null,
            sizeno: null,
            paperno: null,
            optno: null,
            colorno: null,
            colornoadd: null,
            ordqtymin: 500,
            ordqtymax: 100000,
            ordqtyinterval: null,
            ordqtylist: [500, 1000, 2000, 3000, 5000],
          },
        ],
        sizeinfo: [
          {
            covercd: 0,
            sizelist: [
              {
                sizeno: 5498,
                sizename: "90x100",
                width: 90,
                height: 100,
                cutsize: 3,
                non_standard: false,
                req_width: null,
                req_height: null,
                req_paper: null,
                req_color: null,
                req_awkjob: null,
                rst_ordqty: null,
                rst_awkjob: null,
              },
            ],
          },
        ],
        paperinfo: [
          {
            covercd: 0,
            paperlist: [
              {
                paperno: 22927,
                papername: "\uC544\uD2B8\uC9C0(\uBB34\uCF54\uD305) 80g",
                papergroup: "\uC544\uD2B8\uC9C0(\uBB34\uCF54\uD305)",
                pgram: 80,
                req_width: null,
                req_height: null,
                req_awkjob: null,
                rst_ordqty: null,
                rst_prsjob: [{ jobno: 3230, jobname: "\uB3C5\uD310UV\uC778\uC1C4" }],
                rst_awkjob: null,
              },
            ],
            ncr: null,
          },
        ],
        colorinfo: [
          {
            covercd: 0,
            pagelist: [
              {
                pagecd: 0,
                type: "radio",
                colorlist: [
                  {
                    colorno: 302,
                    colorname: "\uB2E8\uBA74 \uCE7C\uB77C",
                    pdfpage: 1,
                    req_prsjob: [
                      { jobpresetno: 3110, jobno: 3110, jobname: "\uC635\uC14B\uC778\uC1C4" },
                    ],
                    req_awkjob: null,
                    rst_prsjob: null,
                    rst_awkjob: null,
                    rst_opt: null,
                  },
                ],
                addtype: null,
                coloraddlist: null,
              },
            ],
          },
        ],
        optioninfo: null,
        prsjobinfo: [
          {
            jobpresetno: 3110,
            jobpreset: "\uC635\uC14B\uC778\uC1C4",
            prsjoblist: [
              {
                covercd: 0,
                jobno: 3110,
                jobname: "\uD569\uD310\uC635\uC14B\uC778\uC1C4",
                unit: "\uB9E4",
                req_color: [{ colorno: 302, colorname: "\uB2E8\uBA74 \uCE7C\uB77C" }],
                rst_paper: null,
                rst_awkjob: null,
              },
            ],
          },
        ],
        awkjobinfo: [
          {
            covercd: 0,
            type: "checkbox",
            jobgrouplist: [
              {
                jobgroupno: 36500,
                jobgroup: "\uCE7C\uC120\uBC29\uD5A5",
                type: "select",
                displayloc: "awkjob",
                awkjoblist: [
                  {
                    jobno: 36510,
                    jobname: "\uCE7C\uC120 \uAC00\uB85C\uBC29\uD5A5",
                    namestep1: "\uCE7C\uC120\uBC29\uD5A5",
                    namestep2: "\uAC00\uB85C\uBC29\uD5A5",
                    unit: "\uB9E4",
                    unitlist: null,
                    ck_page: null,
                    req_joboption: null,
                    req_jobsize: null,
                    req_jobqty: null,
                    req_awkjob: null,
                    rst_jobqty: null,
                    rst_cutcnt: null,
                    rst_size: null,
                    rst_paper: null,
                    rst_color: null,
                    rst_awkjob: null,
                  },
                ],
              },
            ],
          },
        ],
        deliverinfo: {
          dlvyfree: [{ usrkd: 31, usrkdname: "Family", mincost: 50000 }],
          dlvymcdlist: [],
        },
      };
      const result = ProdInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prodno).toBe(40007);
        expect(result.data.prodname).toBe("\uAC00\uC131\uBE44\uC2A4\uD2F0\uCEE4(\uC0AC\uAC01)");
        expect(result.data.coverinfo).toHaveLength(1);
        expect(result.data.sizeinfo).toHaveLength(1);
        expect(result.data.paperinfo).toHaveLength(1);
      }
    });

    it("should validate product with null optional fields", () => {
      const data = {
        timestamp: "2025-10-15 03:05:19",
        prodno: 40099,
        prodname: "Test Product",
        seltype: "S",
        pjoin: 0,
        unit: "\uAC1C",
        ctptime: "null",
        dlvyprepay: false,
        dlvygrpno: null,
        dlvygrpname: null,
        filetype: "PDF",
        coverinfo: [],
        ordqty: [],
        sizeinfo: [],
        paperinfo: [],
        colorinfo: [],
        optioninfo: null,
        prsjobinfo: [],
        awkjobinfo: [],
        deliverinfo: null,
      };
      const result = ProdInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject product without prodno", () => {
      const data = {
        timestamp: "2025-10-15",
        prodname: "Missing ID",
        seltype: "M",
      };
      const result = ProdInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should validate with extra fields (passthrough)", () => {
      const data = {
        timestamp: "2025-10-15 03:05:19",
        prodno: 40007,
        prodname: "Test",
        seltype: "M",
        pjoin: 0,
        unit: "ea",
        ctptime: "null",
        dlvyprepay: true,
        dlvygrpno: 1,
        dlvygrpname: "Bundle",
        filetype: "PDF",
        coverinfo: [],
        ordqty: [],
        sizeinfo: [],
        paperinfo: [],
        colorinfo: [],
        optioninfo: null,
        prsjobinfo: [],
        awkjobinfo: [],
        deliverinfo: null,
        // Extra fields from real API
        prodaddinfo: null,
        ordmax: 50,
        prodmsg: null,
      };
      const result = ProdInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        // Extra fields should be preserved via passthrough
        expect((result.data as Record<string, unknown>).ordmax).toBe(50);
      }
    });
  });

  describe("Real catalog data validation", () => {
    it("should validate real 40007.json prod_info from catalog", () => {
      const fs = require("fs");
      const path = require("path");
      const catalogPath = path.resolve(
        __dirname,
        "../../../../../ref/wowpress/catalog/products/40007.json"
      );

      // Skip if catalog data not available
      if (!fs.existsSync(catalogPath)) {
        return;
      }

      const rawProduct = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      const result = ProdInfoSchema.safeParse(rawProduct.raw.prod_info);

      if (!result.success) {
        console.error("Validation errors:", JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });
  });
});
