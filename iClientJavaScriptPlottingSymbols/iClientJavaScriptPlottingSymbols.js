/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Polygon.js
 */

/**
 *
 * Class: SuperMap.Geometry.GeoPlotting
 * 标绘扩展符号类。
 * 该类是抽象类，具体的符号由其子类表现。子类必须实现方法 calculateParts()。
 *
 * Inherits from:
 *  - <SuperMap.Geometry.Polygon>
 */
SuperMap.Geometry.GeoPlotting = SuperMap.Class(
    SuperMap.Geometry.Polygon, {
        /**
         * Property: _controlPoints
         * 定义控制点字段
         * 用于存储标绘扩展符号的所有控制点
         */
        _controlPoints: [],

        /**
         * Constructor: SuperMap.Geometry.GeoPlotting
         * 标绘扩展符号基类
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 控制点数组
         */
        initialize: function(points) {
            SuperMap.Geometry.Polygon.prototype.initialize.apply(this, arguments);
            this._controlPoints = points;

            if(points && points.length > 0){
                this.calculateParts();
            }
        },

        /**
         * APIMethod: getControlPoints
         * 获取符号控制点
         */
        getControlPoints: function() {
            return this._controlPoints;
            //return this.cloneControlPoints(this._controlPoints);
        },

        /**
         * APIMethod: setControlPoint
         * 设置控制点
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 控制点数组
         */
        setControlPoint: function(points){
           if(points && points.length && points.length > 0){
               this._controlPoints = points;
               this.calculateParts();
           }
        },

        /**
         * APIMethod: clone
         * 克隆对象。
         *
         * Returns:
         * {<SuperMap.Geometry.Collection>} 克隆的几何对象。
         */
        clone: function(){
            var geoState = new SuperMap.Geometry.GeoPlotting();
            var controlPoints = [];
            //赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoState._controlPoints = controlPoints;
            return geoState;
        },

        /**
         * APIMethod: toJSON
         * 将标绘扩展对象转换为json数据（只解析控制点）
         *
         * Returns:
         * {String} 返回转换后的 JSON 对象。
         */
        toJSON: function(){
            if(!this._controlPoints)
            {
                return null;
            }

            var len = this._controlPoints.length;
            var arr = [];
            for(var i = 0; i < len; i++)
            {
                arr.push(this.controlPointToJSON(this._controlPoints[i]));
            }

            return "{\"controlPoints\":[" + arr.join(",") + "]}";
        },

        /**
         * APIMethod: calculateParts
         * 通过控制点计算标绘扩展符号所有点 。
         * 每次调用此方法都会重置标绘扩展符号要素的geometry 。
         * 此方法需要子类实现
         */
        calculateParts: function(){},

        /**
         * Method: calculateVector
         * 计算和基准向量v夹角为a、长度为d的目标向量（理论上有两个，一左一右）
         *
         * Parameters:
         * v - {<SuperMap.Geometry.Point>} 基准向量
         * a - {Number} 目标向量和基准向量的夹角，默认为90度，这里的单位使用弧度
         * d - {Number} 目标向量的长度，即模，默认为1，即单位向量
         *
         * Returns:
         * {Array(<SuperMap.Geometry.Point>)} 回目标向量数组（就两个向量，一左一右）
         */
        calculateVector: function(v, a, d){
            if(!a) a =  Math.PI/2;
            if(!d) d = 1;

            //定义目标向量的头部   x 坐标
            var x_1;
            var x_2;
            //定义目标向量的头部   y 坐标
            var y_1;
            var y_2;
            //定义目标向量，一左一右
            var v_l;
            var v_r;

            //计算基准向量v的模
            var d_v = Math.sqrt(v.x*v.x+v.y*v.y);

            //基准向量的斜率为0时，y值不能作为除数，所以需要特别处理
            if(v.y == 0)
            {
                //计算x,会有两个值
                x_1 = x_2 = d_v*d*Math.cos(a)/v.x;
                //根据v.x的正负判断目标向量的左右之分
                if(v.x>0)
                {
                    //计算y
                    y_1 = Math.sqrt(d*d-x_1*x_1);
                    y_2 = -y_1;
                }
                else if(v.x<0)
                {
                    //计算y
                    y_2 = Math.sqrt(d*d-x_1*x_1);
                    y_1 = -y_2;
                }
                v_l = new SuperMap.Geometry.Point(x_1,y_1);
                v_r = new SuperMap.Geometry.Point(x_2,y_2);
            }
            //此为大多数情况
            else
            {
                //转换为y=nx+m形式
                var n = -v.x/v.y;
                var m = d*d_v*Math.cos(a)/v.y;
                //
                //x*x + y*y = d*d
                //转换为a*x*x + b*x + c = 0
                var a = 1+n*n;
                var b = 2*n*m;
                var c = m*m - d*d;
                //计算x,会有两个值
                x_1 = (-b - Math.sqrt(b*b-4*a*c))/(2*a);
                x_2 = (-b + Math.sqrt(b*b-4*a*c))/(2*a);
                //计算y
                y_1 = n*x_1 + m;
                y_2 = n*x_2 + m;
                //当向量向上时
                if(v.y>=0)
                {
                    v_l = new SuperMap.Geometry.Point(x_1,y_1);
                    v_r = new SuperMap.Geometry.Point(x_2,y_2);
                }
                //当向量向下时
                else if(v.y<0)
                {
                    v_l = new SuperMap.Geometry.Point(x_2,y_2);
                    v_r = new SuperMap.Geometry.Point(x_1,y_1);
                }
            }
            return [v_l,v_r];
        },

        /**
         * Method: calculateIntersection
         * 计算两条直线的交点
         * 通过向量的思想进行计算，需要提供两个向量以及两条直线上各自一个点
         *
         * Parameters:
         * v_1 - {<SuperMap.Geometry.Point>} 直线1的向量
         * v_2 - {<SuperMap.Geometry.Point>} 直线2的向量
         * points1 - {<SuperMap.Geometry.Point>} 直线1上的任意一点
         * points2 - {<SuperMap.Geometry.Point>} 直线2上的任意一点
         *
         * Returns:
         * {Array(<SuperMap.Geometry.Point>)} 返回交点
         */
        calculateIntersection: function(v_1, v_2, point1, point2){
            //定义交点的坐标
            var x;
            var y;
            //如果向量v_1和v_2平行
            if(v_1.y*v_2.x-v_1.x*v_2.y == 0)
            {
                //平行也有两种情况
                //同向
                if(v_1.x*v_2.x>0 || v_1.y*v_2.y>0)
                {
                    //同向直接取两个点的中点
                    x = (point1.x+point2.x)/2;
                    y = (point1.y+point2.y)/2;
                }
                //反向
                else
                {
                    //如果反向直接返回后面的点位置
                    x = point2.x;
                    y = point2.y;
                }
            }
            else
            {
                //
                x = (v_1.x*v_2.x*(point2.y-point1.y)+point1.x*v_1.y*v_2.x-point2.x*v_2.y*v_1.x)/(v_1.y*v_2.x-v_1.x*v_2.y);
                if(v_1.x!=0)
                {
                    y = (x-point1.x)*v_1.y/v_1.x+point1.y;
                }
                //不可能v_1.x和v_2.x同时为0
                else
                {
                    y = (x-point2.x)*v_2.y/v_2.x+point2.y;
                }
            }
            return new SuperMap.Geometry.Point(x,y);

        },

        /**
         * Method: calculateAngularBisector
         * 计算两个向量的角平分线向量
         *
         * Parameters:
         * v1 - {<SuperMap.Geometry.Point>} 向量1
         * v2 - {<SuperMap.Geometry.Point>} 向量2
         *
         * Returns:
         * {Array(<SuperMap.Geometry.Point>)} 返回角平分线向量
         */
        calculateAngularBisector: function(v1, v2){
            //计算角平分线的思想是取两个向量的单位向量，然后相加
            var d1 = Math.sqrt(v1.x*v1.x+v1.y*v1.y);
            var d2 = Math.sqrt(v2.x*v2.x+v2.y*v2.y);
            return new SuperMap.Geometry.Point(v1.x/d1+v2.x/d2,v1.y/d1+v2.y/d2);
        },

        /**
         * Method: calculateIntersectionFromTwoCorner
         * 通过三角形的底边两端点坐标以及底边两夹角，计算第三个点坐标
         *
         * Parameters:
         * pointS - {<SuperMap.Geometry.Point>} 底边第一个点
         * pointE - {<SuperMap.Geometry.Point>} 底边第二个点
         * a_S - {Number} 底边和第一个点所在的另一条边的夹角
         * a_E - {Number} 底边和第二个点所在的另一条边的夹角
         *
         * Returns:
         * {Array(<SuperMap.Geometry.Point>)} 返回顶点（理论上存在两个值）
         */
        calculateIntersectionFromTwoCorner: function(pointS, pointE, a_S, a_E){
            if(!a_S) a_S = Math.PI/4;
            if(!a_E) a_E = Math.PI/4;

            //起始点、结束点、交点加起来三个点，形成一个三角形
            //斜边（起始点到结束点）的向量为
            var v_SE = new SuperMap.Geometry.Point(pointE.x-pointS.x,pointE.y-pointS.y);
            //计算起始点、交点的单位向量
            var v_SI_lr = this.calculateVector(v_SE,a_S,1);
            //获取
            var v_SI_l = v_SI_lr[0];
            var v_SI_r = v_SI_lr[1];
            //计算结束点、交点的单位向量
            var v_EI_lr = this.calculateVector(v_SE,Math.PI-a_S,1);
            //获取
            var v_EI_l = v_EI_lr[0];
            var v_EI_r = v_EI_lr[1];
            //求左边的交点
            var pointI_l = this.calculateIntersection(v_SI_l,v_EI_l,pointS,pointE);
            //计算右边的交点
            var pointI_r = this.calculateIntersection(v_SI_r,v_EI_r,pointS,pointE);
            return [pointI_l,pointI_r];
        },

        /**
         * Method: cloneControlPoints
         * 克隆控制点数组
         *
         */
        cloneControlPoints: function(cp){
            var controlPoints = [];

            for(var i = 0; i < cp.length; i++){
                controlPoints.push(cp[i].clone());
            }

            return controlPoints;
        },

        /**
         * Method: controlPointToJSON
         * 将控制点转换为Json
         *
         * Parameters:
         * cp - {<SuperMap.Geometry.Point>} 要转换为Json的控制点
         */
        controlPointToJSON: function(cp){
            return "{\"x\":  " + cp.x + ", \"y\": " + cp.y + "}";
        },

        CLASS_NAME: "SuperMap.Geometry.GeoPlotting"
    }
);

/**
 * APIMethod: getControlPointsFromJSON
 * 根据控制点字符串获取控制点数据
 *
 * Parameters:
 * str - {String} 控制点字符串，形如："[{...},{...}...]"
 *
 * Returns:
 * {Array(<SuperMap.Geometry.Point>)} 控制点数组
 */
SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON = function(str){
    var cps = [];
    //匹配每一个Point的json格式
    var r = /{.*?}/g;
    var arr = str.match(r);
    for(var i = 0, len = arr.length ;i<len; i++)
    {
        var point = eval('(' + arr[i] + ')');
        cps.push(new SuperMap.Geometry.Point(point.x, point.y));
    }
    return cps;
};
/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoCircle
 * 圆。
 * 使用圆心和圆上一点绘制出一个圆
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoCircle = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Constructor: SuperMap.Geometry.GeoCircle
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 需要传入的控制点（理论上应该是两个），默认为null
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: toJSON
         * 将军标符号圆对象转换为json数据（只解析控制点）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            return SuperMap.Geometry.GeoPlotting.prototype.toJSON.apply(this, arguments);
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoCircle =new SuperMap.Geometry.GeoCircle();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoCircle._controlPoints = controlPoints;
            return geoCircle;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过中点和边缘点计算圆的边缘360个点，组成一个圆
         */
        calculateParts: function(){
            //清空原有的所有点
            this.components = [];
            //至少需要两个控制点
            if(this._controlPoints.length>1)
            {
                //取第一个作为中心点
                var centerPoint = this._controlPoints[0];
                //取最后一个作为半径控制点
                var radiusPoint = this._controlPoints[this._controlPoints.length-1];
                var points = [];
                //计算圆的半径
                var radius = Math.sqrt((radiusPoint.x - centerPoint.x) * (radiusPoint.x - centerPoint.x) +
                (radiusPoint.y - centerPoint.y) * (radiusPoint.y - centerPoint.y));
                //计算圆的边缘所有点
                for(var i = 0; i < 360; i++)
                {
                    var radians = (i + 1) * Math.PI / 180;
                    var circlePoint = new SuperMap.Geometry.Point(Math.cos(radians) * radius + centerPoint.x, Math.sin(radians) * radius + centerPoint.y);
                    points[i] = circlePoint;
                }
                //设置点集
                this.components.push(new SuperMap.Geometry.LinearRing(points));
            }
        },

        CLASS_NAME: "SuperMap.Geometry.GeoCircle"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoCircle 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoCircle>} 返回的 GeoCircle 对象。
 */
SuperMap.Geometry.GeoCircle.fromJSON = function(str){
    var geoCircle = new SuperMap.Geometry.GeoCircle();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoCircle._controlPoints = arr;
    return geoCircle;
};/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoCurveFlag
 * 曲线旗标。
 * 使用两个控制点直接创建曲线旗标
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoCurveFlag = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Constructor: SuperMap.Geometry.GeoCurveFlag
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 需要传入的控制点（理论上应该是两个），默认为null
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: toJSON
         * 将军标符号曲线旗标对象转换为json数据（只解析了控制点）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            return SuperMap.Geometry.GeoPlotting.prototype.toJSON.apply(this, arguments);
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoCurveFlag =new SuperMap.Geometry.GeoCurveFlag();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoCurveFlag._controlPoints = controlPoints;
            return geoCurveFlag;
        },
        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过两个控制点计算曲线旗标的所有点
         */
        calculateParts: function(){
            var controlPois = this.cloneControlPoints(this._controlPoints);
            
            //清空原有的所有点
            this.components = [];
            //至少需要两个控制点
            if(controlPois.length>1)
            {
                //取第一个
                var startPoint = controlPois[0];
                //取最后一个
                var endPoint = controlPois[controlPois.length-1];
                //上曲线起始点
                var point1 = startPoint;
                //上曲线第一控制点
                var point2 = new SuperMap.Geometry.Point((endPoint.x-startPoint.x)/4+startPoint.x,(endPoint.y-startPoint.y)/8+startPoint.y);
                //上曲线第二个点
                var point3 = new SuperMap.Geometry.Point((startPoint.x+endPoint.x)/2,startPoint.y);
                //上曲线第二控制点
                var point4 = new SuperMap.Geometry.Point((endPoint.x-startPoint.x)*3/4+startPoint.x,-(endPoint.y-startPoint.y)/8+startPoint.y);
                //上曲线结束点
                var point5 = new SuperMap.Geometry.Point(endPoint.x,startPoint.y);

                //下曲线结束点
                var point6 = new SuperMap.Geometry.Point(endPoint.x,(startPoint.y+endPoint.y)/2);
                //下曲线第二控制点
                var point7 = new SuperMap.Geometry.Point((endPoint.x-startPoint.x)*3/4+startPoint.x,(endPoint.y-startPoint.y)*3/8+startPoint.y);
                //下曲线第二个点
                var point8 = new SuperMap.Geometry.Point((startPoint.x+endPoint.x)/2,(startPoint.y+endPoint.y)/2);
                //下曲线第一控制点
                var point9 = new SuperMap.Geometry.Point((endPoint.x-startPoint.x)/4+startPoint.x,(endPoint.y-startPoint.y)*5/8+startPoint.y);
                //下曲线起始点
                var point10 = new SuperMap.Geometry.Point(startPoint.x,(startPoint.y+endPoint.y)/2);
                //旗杆底部点
                var point11 = new SuperMap.Geometry.Point(startPoint.x,endPoint.y);
                //计算上曲线
                var curve1 = SuperMap.Geometry.LineString.createBezier2([point1,point2,point3,point4,point5]).components;
                //计算下曲线
                var curve2 = SuperMap.Geometry.LineString.createBezier2([point6,point7,point8,point9,point10]).components;

                //合并
                var points = curve1.concat(curve2);
                points.push(point11);

                this.components.push(new SuperMap.Geometry.LinearRing(points));
            }
        },

        CLASS_NAME: "SuperMap.Geometry.GeoCurveFlag"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoCurveFlag 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoCurveFlag>} 返回的 GeoCurveFlag 对象。
 */
SuperMap.Geometry.GeoCurveFlag.fromJSON = function(str){
    var geoCurveFlag = new SuperMap.Geometry.GeoCurveFlag();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoCurveFlag._controlPoints = arr;
    return geoCurveFlag;
};/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoDiagonalArrow
 * 斜箭头
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoDiagonalArrow = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Property: _ratio
         * 箭头长度与宽度的比值，箭头三角形需要占用总长度的1/_ratio
         */
        _ratio: 6,

        /**
         * Constructor: SuperMap.Geometry.GeoDiagonalArrow
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 初始化时传入的控制点（理论上至少两个，默认为null）
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: getRatio
         * 获取箭头长宽比值，默认为6倍
         */
        getRatio: function() {
            return this._ratio;
        },

        /**
         * APIMethod: setRatio
         * 设置箭头长宽比值，默认为6倍
         *
         * Parameters:
         * value - {Number} 箭头长宽比值
         */
        setRatio: function(value){
            if(value){
                this._ratio = value;
                this.calculateParts();
            }
        },

        /**
         * APIMethod: toJSON
         * 将军标符号斜箭头对象转换为json数据（解析了控制点和长宽比值）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            if(!this._controlPoints)
            {
                return null;
            }
            var result;
            var len = this._controlPoints.length;
            var arr = [];
            for(var i = 0; i<len; i++)
            {
                arr.push(this.controlPointToJSON(this._controlPoints[i]));
            }
            result = "{\"controlPoints\":["+arr.join(",")+"],\"ratio\":"+this._ratio+"}";
            return result;
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoDiagonalArrow =new SuperMap.Geometry.GeoDiagonalArrow();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoDiagonalArrow._ratio = this._ratio;
            geoDiagonalArrow._controlPoints = controlPoints;
            return geoDiagonalArrow;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过控制点计算箭头的所有绘制点
         */
        calculateParts: function(){
            //判定少于两个点或者为空，则直接返回
            if(this._controlPoints == null || this._controlPoints.length<2)
            {
                return;
            }
            //判断如果为两个点，且两个点重合时也直接返回
            if(this._controlPoints.length == 2 && (this._controlPoints[0]).equals(this._controlPoints[1]))
            {
                return;
            }
            //清空原有的所有点
            this.components = [];
            //计算只有两个点时，即直的斜箭头
            if(this._controlPoints.length == 2)
            {
                this.calculateTwoPoints();
            }
            //计算有三个或三个以上的点时，即弯曲的斜箭头
            else
            {
                this.calculateMorePoints();
            }
        },

        /**
         * Method: calculateTwoPoints
         * 只有两个控制点时
         *
         */
        calculateTwoPoints: function(){
            var controlPois = this.cloneControlPoints(this._controlPoints);

            //取出首尾两个点
            var pointS = controlPois[0];
            var pointE = controlPois[1];
            //计算箭头总长度
            var l = Math.sqrt((pointE.y-pointS.y)*(pointE.y-pointS.y)+(pointE.x-pointS.x)*(pointE.x-pointS.x));
            //计算直箭头的宽
            var w = l/this._ratio;

            //计算三角形的底边中心点坐标
            var x_ = pointS.x + (pointE.x - pointS.x)*(this._ratio-1)/this._ratio;
            var y_ = pointS.y + (pointE.y - pointS.y)*(this._ratio-1)/this._ratio;
            var point_o = new SuperMap.Geometry.Point(x_,y_);

            //计算
            var v_lr_ = this.calculateVector(new SuperMap.Geometry.Point(pointE.x-pointS.x,pointE.y-pointS.y),Math.PI/2,w/2);
            //获取左边尾部向量
            var v_l_ = v_lr_[0];
            //获取右边尾部向量
            var v_r_ = v_lr_[1];
            //获取左边尾部点
            var point_l = new SuperMap.Geometry.Point(v_l_.x+pointS.x,v_l_.y+pointS.y);
            //获取右边尾部点
            var point_r = new SuperMap.Geometry.Point(v_r_.x+pointS.x,v_r_.y+pointS.y);

            var point_h_l = new SuperMap.Geometry.Point(v_l_.x/this._ratio+x_,v_l_.y/this._ratio+y_);
            var point_h_r = new SuperMap.Geometry.Point(v_r_.x/this._ratio+x_,v_r_.y/this._ratio+y_);

            //计算三角形左边点
            var point_a_l = new SuperMap.Geometry.Point(point_h_l.x*2-point_h_r.x,point_h_l.y*2-point_h_r.y);
            //计算三角形右边点
            var point_a_r = new SuperMap.Geometry.Point(point_h_r.x*2-point_h_l.x,point_h_r.y*2-point_h_l.y);

            this.components.push(new SuperMap.Geometry.LinearRing([point_l,point_h_l,point_a_l,pointE,point_a_r,point_h_r,point_r]));
        },

        /**
         * Method: calculateMorePoints
         * 重写了父类的方法
         * 用于通过控制点计算箭头的所有绘制点
         */
        calculateMorePoints: function(){
            var controlPois = this.cloneControlPoints(this._controlPoints);

            //计算箭头总长度
            var l = 0;
            //计算直箭头的宽
            var w = 0;
            for(var i = 0; i < controlPois.length - 1; i++)
            {
                //取出首尾两个点
                var pointS = controlPois[i];
                var pointE = controlPois[i+1];
                l += Math.sqrt((pointE.y-pointS.y)*(pointE.y-pointS.y)+(pointE.x-pointS.x)*(pointE.x-pointS.x));
            }
            w = l/this._ratio;

            var a = Math.atan(w/(2*l));

            //定义左右控制点集合
            var points_C_l = [];
            var points_C_r = [];
            //定义尾部左右的起始点
            var point_t_l = new SuperMap.Geometry.Point();
            var point_t_r = new SuperMap.Geometry.Point();


            //计算中间的所有交点
            for(var j = 0; j < controlPois.length-2; j++)
            {
                var pointU_1 = controlPois[j];//第一个用户传入的点
                var pointU_2 = controlPois[j+1];//第二个用户传入的点
                var pointU_3 = controlPois[j+2];//第三个用户传入的点

                //计算向量
                var v_U_1_2 = new SuperMap.Geometry.Point(pointU_2.x-pointU_1.x,pointU_2.y-pointU_1.y);
                var v_U_2_3 = new SuperMap.Geometry.Point(pointU_3.x-pointU_2.x,pointU_3.y-pointU_2.y);


                //定义左边第一个控制点
                var point_l_1 = new SuperMap.Geometry.Point();
                //定义右边第一个控制点
                var point_r_1 = new SuperMap.Geometry.Point();
                //如果j=0时，左右第一个控制点需要计算
                if(j == 0)
                {
                    var v_lr_ = this.calculateVector(v_U_1_2,Math.PI/2,w/2);
                    //获取左边尾部点
                    var v_l_ = v_lr_[0];
                    //获取右边尾部点
                    var v_r_ = v_lr_[1];
                    //获取左边尾部点
                    point_t_l = point_l_1 = new SuperMap.Geometry.Point(v_l_.x+pointU_1.x,v_l_.y+pointU_1.y);
                    //获取右边尾部点
                    point_t_r = point_r_1 = new SuperMap.Geometry.Point(v_r_.x+pointU_1.x,v_r_.y+pointU_1.y);
                }
                //否则获取上一次的记录
                else
                {
                    point_l_1 = points_C_l[points_C_l.length-1];
                    point_r_1 = points_C_r[points_C_r.length-1];
                }
                var v_lr = this.calculateVector(v_U_1_2,a,1);
                //这里的向量需要反过来
                //获取左边向量
                var v_l = v_lr[1];
                //获取右边向量
                var v_r = v_lr[0];
                //定义角平分线向量
                var v_angularBisector = this.calculateAngularBisector(new SuperMap.Geometry.Point(-v_U_1_2.x,-v_U_1_2.y),v_U_2_3);
                //求交点
                //计算左边第二个控制点
                var point_l_2 = this.calculateIntersection(v_l,v_angularBisector,point_l_1,pointU_2);
                var point_r_2 = this.calculateIntersection(v_r,v_angularBisector,point_r_1,pointU_2);


                //添加后面的拐角控制点
                points_C_l.push(new SuperMap.Geometry.Point((point_l_1.x+point_l_2.x)/2,(point_l_1.y+point_l_2.y)/2));
                points_C_l.push(point_l_2);
                points_C_r.push(new SuperMap.Geometry.Point((point_r_1.x+point_r_2.x)/2,(point_r_1.y+point_r_2.y)/2));
                points_C_r.push(point_r_2);
            }

            //进入计算头部
            //计算一下头部的长度
            var pointU_E2 = controlPois[controlPois.length-2];//倒数第二个用户点
            var pointU_E1 = controlPois[controlPois.length-1];//最后一个用户点
            var head_d = Math.sqrt((pointU_E2.x-pointU_E1.x)*(pointU_E2.x-pointU_E1.x) + (pointU_E2.y-pointU_E1.y)*(pointU_E2.y-pointU_E1.y));
            //定义头部的左右两结束点
            var point_h_l = new SuperMap.Geometry.Point();
            var point_h_r = new SuperMap.Geometry.Point();
            //三角形左右两点数组
            var point_lr_t = [];
            //定义曲线最后一个控制点，也就是头部结束点和最后一个拐角点的中点
            var point_C_l_e = new SuperMap.Geometry.Point();
            var point_C_r_e = new SuperMap.Geometry.Point();
            //定义三角形的左右两个点
            var point_triangle_l = new SuperMap.Geometry.Point();
            var point_triangle_r = new SuperMap.Geometry.Point();

            //获取当前的最后的控制点，也就是之前计算的拐角点
            var point_C_l_eq = points_C_l[points_C_l.length-1];
            var point_C_r_eq = points_C_r[points_C_r.length-1];
            //申明三角形的两边向量
            var v_l_t = new SuperMap.Geometry.Point();
            var v_r_t = new SuperMap.Geometry.Point();
            //三角的高度都不够
            if(head_d <= w)
            {
                point_lr_t = this.calculateVector(new SuperMap.Geometry.Point(pointU_E1.x-pointU_E2.x,pointU_E1.y-pointU_E2.y),Math.PI/2,w/2);
                //获取三角形左右两个向量
                v_l_t = point_lr_t[0];
                v_r_t = point_lr_t[1];

                point_h_l = new SuperMap.Geometry.Point(v_l_t.x/this._ratio+pointU_E2.x,v_l_t.y/this._ratio+pointU_E2.y);
                point_h_r = new SuperMap.Geometry.Point(v_r_t.x/this._ratio+pointU_E2.x,v_r_t.y/this._ratio+pointU_E2.y);
                //计算三角形的左右两点
                point_triangle_l = new SuperMap.Geometry.Point(point_h_l.x*2-point_h_r.x,point_h_l.y*2-point_h_r.y);
                point_triangle_r = new SuperMap.Geometry.Point(point_h_r.x*2-point_h_l.x,point_h_r.y*2-point_h_l.y);


                //计算最后的控制点
                point_C_l_e = new SuperMap.Geometry.Point((point_C_l_eq.x+point_h_l.x)/2,(point_C_l_eq.y+point_h_l.y)/2);
                point_C_r_e = new SuperMap.Geometry.Point((point_C_r_eq.x+point_h_r.x)/2,(point_C_r_eq.y+point_h_r.y)/2);

                //添加最后的控制点（中心点）
                points_C_l.push(point_C_l_e);
                points_C_r.push(point_C_r_e);



            }
            //足够三角的高度
            else
            {
                //由于够了三角的高度，所以首先去掉三角的高度

                //计算向量
                var v_E2_E1 = new SuperMap.Geometry.Point(pointU_E1.x-pointU_E2.x,pointU_E1.y-pointU_E2.y);
                //取模
                var v_E2_E1_d = Math.sqrt(v_E2_E1.x*v_E2_E1.x+v_E2_E1.y*v_E2_E1.y);
                //首先需要计算三角形的底部中心点
                var point_c = new SuperMap.Geometry.Point(pointU_E1.x-v_E2_E1.x*w/v_E2_E1_d,pointU_E1.y-v_E2_E1.y*w/v_E2_E1_d);

                //计算出在三角形上底边上头部结束点
                point_lr_t = this.calculateVector(new SuperMap.Geometry.Point(pointU_E1.x-point_c.x,pointU_E1.y-point_c.y),Math.PI/2,w/2);
                //获取三角形左右两个向量
                v_l_t = point_lr_t[0];
                v_r_t = point_lr_t[1];

                point_h_l = new SuperMap.Geometry.Point(v_l_t.x/this._ratio+point_c.x,v_l_t.y/this._ratio+point_c.y);
                point_h_r = new SuperMap.Geometry.Point(v_r_t.x/this._ratio+point_c.x,v_r_t.y/this._ratio+point_c.y);
                //计算三角形的左右两点
                point_triangle_l = new SuperMap.Geometry.Point(point_h_l.x*2-point_h_r.x,point_h_l.y*2-point_h_r.y);
                point_triangle_r = new SuperMap.Geometry.Point(point_h_r.x*2-point_h_l.x,point_h_r.y*2-point_h_l.y);

                //计算最后的控制点
                point_C_l_e = new SuperMap.Geometry.Point((point_C_l_eq.x+point_h_l.x)/2,(point_C_l_eq.y+point_h_l.y)/2);
                point_C_r_e = new SuperMap.Geometry.Point((point_C_r_eq.x+point_h_r.x)/2,(point_C_r_eq.y+point_h_r.y)/2);

                //添加最后的控制点（中心点）
                points_C_l.push(point_C_l_e);
                points_C_r.push(point_C_r_e);
            }
            //使用控制点计算差值
            //计算贝塞尔的控制点
            var points_BC_l = SuperMap.Geometry.LineString.createBezier2(points_C_l).components;
            var points_BC_r = SuperMap.Geometry.LineString.createBezier2(points_C_r).components;
            //组合左右点集和三角形三个点
            var pointsR = [point_t_l];
            //首先连接左边的差值曲线
            pointsR = pointsR.concat(points_BC_l);
            //添加左边头部结束点
            pointsR.push(point_h_l);
            //添加三角形左边点
            pointsR.push(point_triangle_l);
            //添加三角形顶点
            pointsR.push(pointU_E1);
            //添加三角形右边点
            pointsR.push(point_triangle_r);
            //添加右边头部结束点
            pointsR.push(point_h_r);
            //合并右边的所有点
            for(var k = points_BC_r.length-1; k>=0; k--)
            {
                pointsR.push(points_BC_r[k]);
            }
            //添加右边尾部起始点
            pointsR.push(point_t_r);

            this.components.push(new SuperMap.Geometry.LinearRing(pointsR));
        },

        CLASS_NAME: "SuperMap.Geometry.GeoDiagonalArrow"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoDiagonalArrow 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoDiagonalArrow>} 返回的 GeoDiagonalArrow 对象。
 */
SuperMap.Geometry.GeoDiagonalArrow.fromJSON = function(str){
    var geoDiagonalArrow = new SuperMap.Geometry.GeoDiagonalArrow();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    //匹配长宽比例
    var r = str.match(/"ratio":([0-9]+)/)[1];
    geoDiagonalArrow._ratio = parseInt(r);

    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoDiagonalArrow._controlPoints = arr;
    return geoDiagonalArrow;
};

/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoDoubleArrow
 * 双箭头
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoDoubleArrow = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Constructor: SuperMap.Geometry.GeoDoubleArrow
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 初始化时传入的控制点（理论上为四个，默认为null）
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: toJSON
         * 将军标符号双箭头对象转换为json数据（只解析了控制点）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            return SuperMap.Geometry.GeoPlotting.prototype.toJSON.apply(this, arguments);
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoDoubleArrow =new SuperMap.Geometry.GeoDoubleArrow();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoDoubleArrow._controlPoints = controlPoints;
            return geoDoubleArrow;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过控制点计算箭头的所有绘制点
         */
        calculateParts: function(){
            //判定少于四个点或者为空，则直接返回
            if(this._controlPoints == null || this._controlPoints.length<4)
            {
                return;
            }

            var controlPois = this.cloneControlPoints(this._controlPoints);
            
            //定义四个用户输入点
            var pointU_1 = controlPois[0];
            var pointU_2 = controlPois[1];
            var pointU_3 = controlPois[2];
            var pointU_4 = controlPois[3];

            //计算控制点
            //计算中间用户点
            var pointU_C = new SuperMap.Geometry.Point(((pointU_1.x+pointU_2.x)*5+(pointU_3.x+pointU_4.x))/12,((pointU_1.y+pointU_2.y)*5+(pointU_3.y+pointU_4.y))/12);
            //计算左边外弧的控制点
            var pointC_l_out = this.calculateIntersectionFromTwoCorner(pointU_1,pointU_4,Math.PI/8,Math.PI/6)[0];
            //计算左边内弧的控制点
            var pointC_l_inner = this.calculateIntersectionFromTwoCorner(pointU_C,pointU_4,Math.PI/8,Math.PI/16)[0];
            //计算右边外弧的控制点
            var pointC_r_out = this.calculateIntersectionFromTwoCorner(pointU_2,pointU_3,Math.PI/8,Math.PI/6)[1];
            //计算右边内弧的控制点
            var pointC_r_inner = this.calculateIntersectionFromTwoCorner(pointU_C,pointU_3,Math.PI/8,Math.PI/16)[1];

            //

            var v_l_out = new SuperMap.Geometry.Point(pointC_l_out.x-pointU_4.x,pointC_l_out.y-pointU_4.y);
            var d_l_out = Math.sqrt(v_l_out.x*v_l_out.x+v_l_out.y*v_l_out.y);
            //单位向量
            var v_l_out_1 = new SuperMap.Geometry.Point(v_l_out.x/d_l_out,v_l_out.y/d_l_out);

            var v_l_inner = new SuperMap.Geometry.Point(pointC_l_inner.x-pointU_4.x,pointC_l_inner.y-pointU_4.y);
            var d_l_inner = Math.sqrt(v_l_inner.x*v_l_inner.x+v_l_inner.y*v_l_inner.y);
            //单位向量
            var v_l_inner_1 = new SuperMap.Geometry.Point(v_l_inner.x/d_l_inner,v_l_inner.y/d_l_inner);

            //定义箭头头部的大小比例
            var ab = 0.25;

            //取最短的，除以5是一个经验值，这样效果比较好
            var d_l_a = d_l_out<d_l_inner?d_l_out*ab:d_l_inner*ab;
            //
            var pointC_l_out_2 = new SuperMap.Geometry.Point(v_l_out_1.x*d_l_a+pointU_4.x,v_l_out_1.y*d_l_a+pointU_4.y);
            var pointC_l_inner_2 = new SuperMap.Geometry.Point(v_l_inner_1.x*d_l_a+pointU_4.x,v_l_inner_1.y*d_l_a+pointU_4.y);

            //左箭头左边点
            var pointC_l_a_l = new SuperMap.Geometry.Point(pointC_l_out_2.x*1.5-pointC_l_inner_2.x*0.5,pointC_l_out_2.y*1.5-pointC_l_inner_2.y*0.5);
            //左箭头右边点
            var pointC_l_a_r = new SuperMap.Geometry.Point(pointC_l_inner_2.x*1.5-pointC_l_out_2.x*0.5,pointC_l_inner_2.y*1.5-pointC_l_out_2.y*0.5);

            var v_r_out = new SuperMap.Geometry.Point(pointC_r_out.x-pointU_3.x,pointC_r_out.y-pointU_3.y);
            var d_r_out = Math.sqrt(v_r_out.x*v_r_out.x+v_r_out.y*v_r_out.y);
            var v_r_out_1 = new SuperMap.Geometry.Point(v_r_out.x/d_r_out,v_r_out.y/d_r_out);

            var v_r_inner = new SuperMap.Geometry.Point(pointC_r_inner.x-pointU_3.x,pointC_r_inner.y-pointU_3.y);
            var d_r_inner = Math.sqrt(v_r_inner.x*v_r_inner.x+v_r_inner.y*v_r_inner.y);
            var v_r_inner_1 = new SuperMap.Geometry.Point(v_r_inner.x/d_r_inner,v_r_inner.y/d_r_inner);

            //取最短的，除以5是一个经验值，这样效果比较好
            var d_r_a = d_r_out<d_r_inner?d_r_out*ab:d_r_inner*ab;
            var pointC_r_out_2 = new SuperMap.Geometry.Point(v_r_out_1.x*d_r_a+pointU_3.x,v_r_out_1.y*d_r_a+pointU_3.y);
            var pointC_r_inner_2 = new SuperMap.Geometry.Point(v_r_inner_1.x*d_r_a+pointU_3.x,v_r_inner_1.y*d_r_a+pointU_3.y);

            //右箭头箭头右边点
            var pointC_r_a_r = new SuperMap.Geometry.Point(pointC_r_out_2.x*1.5-pointC_r_inner_2.x*0.5,pointC_r_out_2.y*1.5-pointC_r_inner_2.y*0.5);
            //左箭头左边点
            var pointC_r_a_l = new SuperMap.Geometry.Point(pointC_r_inner_2.x*1.5-pointC_r_out_2.x*0.5,pointC_r_inner_2.y*1.5-pointC_r_out_2.y*0.5);

            //计算坐边外弧所有点
            var points_l = SuperMap.Geometry.LineString.createBezier2([pointU_1,pointC_l_out,pointC_l_out_2]).components;

            //计算控制点
            //定义向量
            var v_U_4_3 = new SuperMap.Geometry.Point(pointU_3.x-pointU_4.x,pointU_3.y-pointU_4.y);

            //取部分
            //需要优化，不能左右都取一样，需要按照左右的长度取值，这样更合理一些
            //取u4和C的向量模
            //取u3和C的向量模
            //根据模的大小来取左右向量的长度，；来定位置
            var v_U_4_C = new SuperMap.Geometry.Point(pointU_C.x-pointU_4.x,pointU_C.y-pointU_4.y);
            //求模
            var d_U_4_C = Math.sqrt(v_U_4_C.x*v_U_4_C.x+v_U_4_C.y*v_U_4_C.y);
            var v_U_3_C = new SuperMap.Geometry.Point(pointU_C.x-pointU_3.x,pointU_C.y-pointU_3.y);
            //求模
            var d_U_3_C = Math.sqrt(v_U_3_C.x*v_U_3_C.x+v_U_3_C.y*v_U_3_C.y);

            var percent = 0.4;
            var v_U_4_3_ = new SuperMap.Geometry.Point(v_U_4_3.x*percent,v_U_4_3.y*percent);
            var v_U_4_3_l = new SuperMap.Geometry.Point(v_U_4_3_.x*d_U_4_C/(d_U_4_C+d_U_3_C),v_U_4_3_.y*d_U_4_C/(d_U_4_C+d_U_3_C));
            var v_U_4_3_r = new SuperMap.Geometry.Point(v_U_4_3_.x*d_U_3_C/(d_U_4_C+d_U_3_C),v_U_4_3_.y*d_U_3_C/(d_U_4_C+d_U_3_C));
            //中心点的左控制点
            var pointC_c_l = new SuperMap.Geometry.Point(pointU_C.x-v_U_4_3_l.x,pointU_C.y-v_U_4_3_l.y);
            //中心点右边的控制点
            var pointC_c_r = new SuperMap.Geometry.Point(pointU_C.x+v_U_4_3_r.x,pointU_C.y+v_U_4_3_r.y);

            //测试
            var arr = [pointC_l_inner_2,pointC_l_inner,pointC_c_l,pointU_C,pointC_c_r,pointC_r_inner,pointC_r_inner_2];

            var points_c = SuperMap.Geometry.LineString.createBezier1(arr,0,20).components;
            //var points_c = SuperMap.Geometry.LineString.createBezier(arr,0.05).components;

            //计算右边外弧的所有点
            var points_r = SuperMap.Geometry.LineString.createBezier2([pointC_r_out_2,pointC_r_out,pointU_2]).components;

            //定义结果数组
            var result = points_l;
            result.push(pointC_l_a_l);
            result.push(pointU_4);
            result.push(pointC_l_a_r);
            result = result.concat(points_c);
            result.push(pointC_r_a_l);
            result.push(pointU_3);
            result.push(pointC_r_a_r);
            result = result.concat(points_r);
            //清空原有的所有点
            this.components = [];
            this.components.push(new SuperMap.Geometry.LinearRing(result));
        },

        CLASS_NAME: "SuperMap.Geometry.GeoDoubleArrow"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoDoubleArrow 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoDoubleArrow>} 返回的 GeoDoubleArrow 对象。
 */
SuperMap.Geometry.GeoDoubleArrow.fromJSON = function(str){
    var geoDoubleArrow = new SuperMap.Geometry.GeoDoubleArrow();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoDoubleArrow._controlPoints = arr;
    return geoDoubleArrow;
};/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoRectFlag
 * 直角旗标
 * 使用两个控制点直接创建直角旗标
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoRectFlag = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Constructor: SuperMap.Geometry.GeoRectFlag
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 需要传入的控制点（理论上应该是两个），默认为null
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: toJSON
         * 将军标符号直角旗标对象转换为json数据（只解析了控制点）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            return SuperMap.Geometry.GeoPlotting.prototype.toJSON.apply(this, arguments);
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoRectFlag =new SuperMap.Geometry.GeoRectFlag();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoRectFlag._controlPoints = controlPoints;
            return geoRectFlag;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过两个控制点计算直角旗标的所有点（5个）
         */
        calculateParts: function(){
            //清空原有的所有点
            this.components = [];
            //至少需要两个控制点
            if(this._controlPoints.length>1)
            {
                //取第一个
                var startPoint = this._controlPoints[0];
                //取最后一个
                var endPoint = this._controlPoints[this._controlPoints.length-1];
                var point1 = startPoint.clone();
                var point2 = new SuperMap.Geometry.Point(endPoint.x,startPoint.y);
                var point3 = new SuperMap.Geometry.Point(endPoint.x,(startPoint.y+endPoint.y)/2);
                var point4 = new SuperMap.Geometry.Point(startPoint.x,(startPoint.y+endPoint.y)/2);
                var point5 = new SuperMap.Geometry.Point(startPoint.x,endPoint.y);

                this.components.push(new SuperMap.Geometry.LinearRing([point1, point2, point3, point4, point5]));
            }
        },

        CLASS_NAME: "SuperMap.Geometry.GeoRectFlag"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoRectFlag 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoRectFlag>} 返回的 GeoRectFlag 对象。
 */
SuperMap.Geometry.GeoRectFlag.fromJSON = function(str){
    var geoRectFlag = new SuperMap.Geometry.GeoRectFlag();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoRectFlag._controlPoints = arr;
    return geoRectFlag;
};/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoStraightArrow
 * 直箭头
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoStraightArrow = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Property: _ratio
         * 箭头长度与宽度的比值，箭头三角形需要占用总长度的1/_ratio
         */
        _ratio: 6,

        /**
         * Constructor: SuperMap.Geometry.GeoStraightArrow
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 初始化时传入的控制点（理论上至少两个，默认为null）
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: getRatio
         * 获取箭头长宽比值，默认为6倍
         */
        getRatio: function() {
            return this._ratio;
        },

        /**
         * APIMethod: setRatio
         * 设置箭头长宽比值，默认为6倍
         *
         * Parameters:
         * value - {Number} 箭头长宽比值
         */
        setRatio: function(value){
            if(value){
                this._ratio = value;
                this.calculateParts();
            }
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoStraightArrow =new SuperMap.Geometry.GeoStraightArrow();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoStraightArrow._ratio = this._ratio;
            geoStraightArrow._controlPoints = controlPoints;
            return geoStraightArrow;
        },

        /**
         * APIMethod: toJSON
         * 将军标符号直箭头对象转换为json数据（解析了控制点和长宽比值）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            if(!this._controlPoints)
            {
                return null;
            }
            var result;
            var len = this._controlPoints.length;
            var arr = [];
            for(var i = 0; i<len; i++)
            {
                arr.push(this.controlPointToJSON(this._controlPoints[i]));
            }
            result = "{\"controlPoints\":["+arr.join(",")+"],\"ratio\":"+this._ratio+"}";
            return result;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过控制点计算箭头的所有绘制点
         */
        calculateParts: function(){
            //判定少于两个点或者为空，则直接返回
            if(this._controlPoints == null || this._controlPoints.length<2)
            {
                return;
            }
            //判断如果为两个点，且两个点重合时也直接返回
            if(this._controlPoints.length == 2 && (this._controlPoints[0]).equals(this._controlPoints[1]))
            {
                return;
            }
            //清空原有的所有点
            this.components = [];
            //计算只有两个点时，即直的斜箭头
            if(this._controlPoints.length == 2)
            {
                this.calculateTwoPoints();
            }
            //计算有三个或三个以上的点时，即弯曲的斜箭头
            else
            {
                this.calculateMorePoints();
            }
        },

        /**
         * Method: calculateTwoPoints
         * 计算两个控制点时直箭头的所有绘制点
         * 两个控制点的直箭头绘制点只需要7个就可以构成
         */
        calculateTwoPoints: function(){
            var controlPois = this.cloneControlPoints(this._controlPoints);
            
            //取出第一和第二两个点
            var pointS = controlPois[0];
            var pointE = controlPois[1];
            //计算箭头总长度，即两个控制点的距离
            var l = Math.sqrt((pointE.y-pointS.y)*(pointE.y-pointS.y)+(pointE.x-pointS.x)*(pointE.x-pointS.x));
            //计算直箭头的宽
            var w = l/this._ratio;

            //计算三角形的底边中心点坐标
            var x_ = pointS.x + (pointE.x - pointS.x)*(this._ratio-1)/this._ratio;
            var y_ = pointS.y + (pointE.y - pointS.y)*(this._ratio-1)/this._ratio;
            //计算与基本向量夹角90度的，长度为w/2的向量数组
            var v_lr = this.calculateVector(new SuperMap.Geometry.Point(pointE.x-pointS.x,pointE.y-pointS.y),Math.PI/2,w/2);
            //获取左右向量
            var v_l = v_lr[0];
            var v_r = v_lr[1];
            //左1点
            var point1 = new SuperMap.Geometry.Point(pointS.x+v_l.x,pointS.y+v_l.y);
            //左2点
            var point2 = new SuperMap.Geometry.Point(x_+point1.x-pointS.x,y_+point1.y-pointS.y);
            //左3点
            var point3 = new SuperMap.Geometry.Point(2*point2.x-x_,2*point2.y-y_);
            //顶点
            var point4 = new SuperMap.Geometry.Point(pointE.x,pointE.y);
            //右3点
            var point7 = new SuperMap.Geometry.Point(pointS.x+v_r.x,pointS.y+v_r.y);
            //右2点
            var point6 = new SuperMap.Geometry.Point(x_+point7.x-pointS.x,y_+point7.y-pointS.y);
            //右1点
            var point5 = new SuperMap.Geometry.Point(2*point6.x-x_,2*point6.y-y_);

            this.components.push(new SuperMap.Geometry.LinearRing([point1,point2,point3,point4,point5,point6,point7]));
        },

        /**
         * Method: calculateMorePoints
         * 计算三个或三个以上的控制点时的所有绘制点
         * 由于中间的控制点之间会进行差值，产生曲线效果，所以所需绘制点会很多
         * 这里使用的思想是将所有用户控制点连接起来形成一条折线段，
         * 然后在拐角进行曲线化处理（二次贝塞尔曲线差值），就形成了效果比较好的箭头
         *
         */
        calculateMorePoints: function(){
            var controlPois = this.cloneControlPoints(this._controlPoints);
            
            //计算箭头总长度
            var l = 0;
            //计算直箭头的宽
            var w = 0;
            for(var i = 0;i<controlPois.length-1;i++)
            {
                //取出首尾两个点
                var pointS = controlPois[i];
                var pointE = controlPois[i+1];
                l += Math.sqrt((pointE.y-pointS.y)*(pointE.y-pointS.y)+(pointE.x-pointS.x)*(pointE.x-pointS.x));
            }
            w = l/this._ratio;
            //定义左右控制点集合
            var points_C_l = [];
            var points_C_r = [];
            //定义尾部左右的起始点
            var point_t_l = SuperMap.Geometry.Point();
            var point_t_r = SuperMap.Geometry.Point();
            //计算中间的所有交点
            for(var j = 0;j<controlPois.length-2;j++)
            {
                var pointU_1 = controlPois[j];//第一个用户传入的点
                var pointU_2 = controlPois[j+1];//第二个用户传入的点
                var pointU_3 = controlPois[j+2];//第三个用户传入的点

                //计算向量
                var v_U_1_2 = new SuperMap.Geometry.Point(pointU_2.x-pointU_1.x,pointU_2.y-pointU_1.y);
                var v_U_2_3 = new SuperMap.Geometry.Point(pointU_3.x-pointU_2.x,pointU_3.y-pointU_2.y);

                var v_lr_1_2 = this.calculateVector(v_U_1_2,Math.PI/2,w/2);
                var v_l_1_2 = v_lr_1_2[0];
                var v_r_1_2 = v_lr_1_2[1];
                var v_lr_2_3 = this.calculateVector(v_U_2_3,Math.PI/2,w/2);
                var v_l_2_3 = v_lr_2_3[0];
                var v_r_2_3 = v_lr_2_3[1];
                //获取左右
                var point_l_1 = new SuperMap.Geometry.Point(pointU_1.x+v_l_1_2.x,pointU_1.y+v_l_1_2.y);
                var point_r_1 = new SuperMap.Geometry.Point(pointU_1.x+v_r_1_2.x,pointU_1.y+v_r_1_2.y);
                var point_l_2 = new SuperMap.Geometry.Point(pointU_2.x+v_l_2_3.x,pointU_2.y+v_l_2_3.y);
                var point_r_2 = new SuperMap.Geometry.Point(pointU_2.x+v_r_2_3.x,pointU_2.y+v_r_2_3.y);
                //向量v_U_1_2和向量v-point_l_1和point_r_1是平行的
                //如果向量a=(x1，y1)，b=(x2，y2)，则a//b等价于x1y2－x2y1=0
                //得到(x-point_l_1.x)*v_U_1_2.y=v_U_1_2.x*(y-point_l_1.y)
                //得到(point_l_2.x-x)*v_U_2_3.y=v_U_2_3.x*(point_l_2.y-y)
                //可以求出坐边的交点(x,y)，即控制点
                var point_C_l = this.calculateIntersection(v_U_1_2,v_U_2_3,point_l_1,point_l_2);
                var point_C_r = this.calculateIntersection(v_U_1_2,v_U_2_3,point_r_1,point_r_2);
                //定义中间的控制点
                var point_C_l_c;
                var point_C_r_c;
                if(j == 0)
                {
                    //记录下箭头尾部的左右两个端点
                    point_t_l = point_l_1;
                    point_t_r = point_r_1;
                    //计算第一个曲线控制点
                    point_C_l_c = new SuperMap.Geometry.Point((point_t_l.x+point_C_l.x)/2,(point_t_l.y+point_C_l.y)/2);
                    point_C_r_c = new SuperMap.Geometry.Point((point_t_r.x+point_C_r.x)/2,(point_t_r.y+point_C_r.y)/2);
                    //添加两个拐角控制点中间的中间控制点
                    points_C_l.push(point_C_l_c);
                    points_C_r.push(point_C_r_c);
                }
                else
                {
                    //获取前一个拐角控制点
                    var point_C_l_q = points_C_l[points_C_l.length-1];
                    var point_C_r_q = points_C_r[points_C_r.length-1];
                    //计算两个拐角之间的中心控制点
                    point_C_l_c = new SuperMap.Geometry.Point((point_C_l_q.x+point_C_l.x)/2,(point_C_l_q.y+point_C_l.y)/2);
                    point_C_r_c = new SuperMap.Geometry.Point((point_C_r_q.x+point_C_r.x)/2,(point_C_r_q.y+point_C_r.y)/2);
                    //添加两个拐角控制点中间的中间控制点
                    points_C_l.push(point_C_l_c);
                    points_C_r.push(point_C_r_c);
                }
                //添加后面的拐角控制点
                points_C_l.push(point_C_l);
                points_C_r.push(point_C_r);
            }
            //计算



            //进入计算头部
            //计算一下头部的长度
            var pointU_E2 = controlPois[controlPois.length-2];//倒数第二个用户点
            var pointU_E1 = controlPois[controlPois.length-1];//最后一个用户点
            //
            var v_U_E2_E1 = new SuperMap.Geometry.Point(pointU_E1.x-pointU_E2.x,pointU_E1.y-pointU_E2.y);
            var head_d = Math.sqrt(v_U_E2_E1.x*v_U_E2_E1.x + v_U_E2_E1.y*v_U_E2_E1.y);
            //定义头部的左右两结束点
            var point_h_l;
            var point_h_r;

            //头部左右两向量数组
            var v_lr_h = [];
            var v_l_h = SuperMap.Geometry.Point();
            var v_r_h = SuperMap.Geometry.Point();
            //定义曲线最后一个控制点，也就是头部结束点和最后一个拐角点的中点
            var point_C_l_e = SuperMap.Geometry.Point();
            var point_C_r_e = SuperMap.Geometry.Point();
            //定义三角形的左右两个点
            var point_triangle_l = SuperMap.Geometry.Point();
            var point_triangle_r = SuperMap.Geometry.Point();

            //获取当前的最后的控制点，也就是之前计算的拐角点
            var point_C_l_eq = points_C_l[points_C_l.length-1];
            var point_C_r_eq = points_C_r[points_C_r.length-1];

            //三角的高度都不够
            if(head_d <= w)
            {
                v_lr_h = this.calculateVector(v_U_E2_E1,Math.PI/2,w/2);
                v_l_h = v_lr_h[0];
                v_r_h = v_lr_h[1];
                //获取头部的左右两结束点
                point_h_l = new SuperMap.Geometry.Point(pointU_E2.x+v_l_h.x,pointU_E2.y+v_l_h.y);
                point_h_r = new SuperMap.Geometry.Point(pointU_E2.x+v_r_h.x,pointU_E2.y+v_r_h.y);


                //计算最后的控制点
                point_C_l_e = new SuperMap.Geometry.Point((point_C_l_eq.x+point_h_l.x)/2,(point_C_l_eq.y+point_h_l.y)/2);
                point_C_r_e = new SuperMap.Geometry.Point((point_C_r_eq.x+point_h_r.x)/2,(point_C_r_eq.y+point_h_r.y)/2);

                //添加最后的控制点（中心点）
                points_C_l.push(point_C_l_e);
                points_C_r.push(point_C_r_e);


                //计算三角形的左右两点
                point_triangle_l = new SuperMap.Geometry.Point(2*point_h_l.x-pointU_E2.x,2*point_h_l.y-pointU_E2.y);
                point_triangle_r = new SuperMap.Geometry.Point(2*point_h_r.x-pointU_E2.x,2*point_h_r.y-pointU_E2.y);
            }
            //足够三角的高度
            else
            {
                //由于够了三角的高度，所以首先去掉三角的高度

                //计算向量
                var v_E2_E1 = new SuperMap.Geometry.Point(pointU_E1.x-pointU_E2.x,pointU_E1.y-pointU_E2.y);
                //取模
                var v_E2_E1_d = Math.sqrt(v_E2_E1.x*v_E2_E1.x+v_E2_E1.y*v_E2_E1.y);
                //首先需要计算三角形的底部中心点
                var point_c = new SuperMap.Geometry.Point(pointU_E1.x-v_E2_E1.x*w/v_E2_E1_d,pointU_E1.y-v_E2_E1.y*w/v_E2_E1_d);
                //计算出在三角形上底边上头部结束点

                v_lr_h = this.calculateVector(v_U_E2_E1,Math.PI/2,w/2);
                v_l_h = v_lr_h[0];
                v_r_h = v_lr_h[1];
                //获取头部的左右两结束点
                point_h_l = new SuperMap.Geometry.Point(point_c.x+v_l_h.x,point_c.y+v_l_h.y);
                point_h_r = new SuperMap.Geometry.Point(point_c.x+v_r_h.x,point_c.y+v_r_h.y);

                //计算最后的控制点
                point_C_l_e = new SuperMap.Geometry.Point((point_C_l_eq.x+point_h_l.x)/2,(point_C_l_eq.y+point_h_l.y)/2);
                point_C_r_e = new SuperMap.Geometry.Point((point_C_r_eq.x+point_h_r.x)/2,(point_C_r_eq.y+point_h_r.y)/2);

                //添加最后的控制点（中心点）
                points_C_l.push(point_C_l_e);
                points_C_r.push(point_C_r_e);

                //计算三角形的左右点
                point_triangle_l = new SuperMap.Geometry.Point(2*point_h_l.x-point_c.x,2*point_h_l.y-point_c.y);
                point_triangle_r = new SuperMap.Geometry.Point(2*point_h_r.x-point_c.x,2*point_h_r.y-point_c.y);
            }

            //使用控制点计算差值
            //计算贝塞尔的控制点
            var points_BC_l = SuperMap.Geometry.LineString.createBezier2(points_C_l).components;
            var points_BC_r = SuperMap.Geometry.LineString.createBezier2(points_C_r).components;
            //组合左右点集和三角形三个点
            var pointsR = [point_t_l];
            //首先连接左边的差值曲线
            pointsR = pointsR.concat(points_BC_l);
            //添加左边头部结束点
            pointsR.push(point_h_l);
            //添加三角形左边点
            pointsR.push(point_triangle_l);
            //添加三角形顶点
            pointsR.push(pointU_E1);
            //添加三角形右边点
            pointsR.push(point_triangle_r);
            //添加右边头部结束点
            pointsR.push(point_h_r);
            //合并右边的所有点（先把右边的点倒序）
            pointsR = pointsR.concat(points_BC_r.reverse());

            //添加右边尾部起始点
            pointsR.push(point_t_r);

            this.components.push(new SuperMap.Geometry.LinearRing(pointsR));
        },

        CLASS_NAME: "SuperMap.Geometry.GeoStraightArrow"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoStraightArrow 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoStraightArrow>} 返回的 GeoStraightArrow 对象。
 */
SuperMap.Geometry.GeoStraightArrow.fromJSON = function(str){
    var geoStraightArrow = new SuperMap.Geometry.GeoStraightArrow();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    //匹配长宽比例
    var r = str.match(/"ratio":([0-9]+)/)[1];
    geoStraightArrow._ratio = parseInt(r);

    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoStraightArrow._controlPoints = arr;
    return geoStraightArrow;
};
/**
 * @requires SuperMap/Geometry/Collection.js
 * @requires SuperMap/Geometry/LinearRing.js
 * @requires SuperMap.Geometry.Point.js
 * @requires SuperMap.Geometry.Polygon.js
 * @requires SuperMap.Geometry.GeoPlotting
 */

/**
 *
 * Class: SuperMap.Geometry.GeoTriangleFlag
 * 三角旗标。
 * 使用两个控制点直接创建直角旗标
 *
 * Inherits from:
 *  - <SuperMap.Geometry.GeoPlotting>
 */
SuperMap.Geometry.GeoTriangleFlag = SuperMap.Class(
    SuperMap.Geometry.GeoPlotting, {
        /**
         * Constructor: SuperMap.Geometry.GeoTriangleFlag
         * 构造函数
         *
         * Parameters:
         * points - {Array(<SuperMap.Geometry.Point>)} 需要传入的控制点（理论上应该是两个），默认为null
         */
        initialize: function(points) {
            SuperMap.Geometry.GeoPlotting.prototype.initialize.apply(this, arguments);
        },

        /**
         * APIMethod: toJSON
         * 将军标符号三角旗标对象转换为json数据（只解析了控制点）
         *
         * Returns:
         * {String} 返回的字符串。
         */
        toJSON: function(){
            return SuperMap.Geometry.GeoPlotting.prototype.toJSON.apply(this, arguments);
        },

        /**
         * APIMethod: clone
         * 重写clone方法，必须深赋值
         *
         * Returns:
         * {String} 返回几何对象。
         */
        clone: function(){
            var geoTriangleFlag =new SuperMap.Geometry.GeoTriangleFlag();
            var controlPoints = [];
            //这里只需要赋值控制点
            for(var i = 0, len = this._controlPoints.length; i<len; i++)
            {
                //这里必须深赋值，不然在编辑时由于引用的问题出现错误
                controlPoints.push(this._controlPoints[i].clone());
            }
            geoTriangleFlag._controlPoints = controlPoints;
            return geoTriangleFlag;
        },

        /**
         * Method: calculateParts
         * 重写了父类的方法
         * 用于通过两个控制点计算三角旗标的所有点（4个）
         */
        calculateParts: function(){
            //清空原有的所有点
            this.components = [];
            //至少需要两个控制点
            if(this._controlPoints.length>1)
            {
                var startPoint = this._controlPoints[0];
                //取最后一个
                var endPoint = this._controlPoints[this._controlPoints.length-1];
                var point1 = startPoint.clone();
                var point2 = new SuperMap.Geometry.Point(endPoint.x,(startPoint.y+endPoint.y)/2);
                var point3 = new SuperMap.Geometry.Point(startPoint.x,(startPoint.y+endPoint.y)/2);
                var point4 = new SuperMap.Geometry.Point(startPoint.x,endPoint.y);

                this.components.push(new SuperMap.Geometry.LinearRing([point1, point2, point3, point4]));
            }
        },

        CLASS_NAME: "SuperMap.Geometry.GeoTriangleFlag"
    }
);

/**
 * APIMethod: fromJSON
 * 根据json数据转换为 GeoTriangleFlag 对象
 *
 * Parameters:
 * str - {String} json数据
 *
 * Returns:
 * {<SuperMap.Geometry.GeoTriangleFlag>} 返回的 GeoTriangleFlag 对象。
 */
SuperMap.Geometry.GeoTriangleFlag.fromJSON = function(str){
    var geoTriangleFlag = new SuperMap.Geometry.GeoTriangleFlag();
    //匹配控制点的数据
    //取第二个代表获取括号内匹配的
    var s = str.match(/"controlPoints":(\[.*?\])/)[1];
    var arr = SuperMap.Geometry.GeoPlotting.getControlPointsFromJSON(s);
    geoTriangleFlag._controlPoints = arr;
    return geoTriangleFlag;
};
/**
 * @requires SuperMap/Handler.js
 * @requires SuperMap/Geometry/Point.js
 */

/**
 * Class: SuperMap.Handler.Plotting
 * 绘制态势符号的事件处理器（抽象类）
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.Plotting = SuperMap.Class(SuperMap.Handler, {
    /**
     * APIProperty: controlPoints
     * 存储标绘扩展符号的控制点。
     */
    controlPoints: [],

    /**
     * APIProperty: plotting
     * 标绘扩展符号，在子类的 createFeature() 中确定其实际类型。
     */
    plotting: null,

    /**
     * APIProperty: controlPoints
     * 标绘扩展符号是否处于绘制过程中，控制符号的动态显示。
     */
    isDrawing: false,

    /**
     * APIProperty: layerOptions
     * {Object} 临时绘制图层的可选属性，可用来设置图层的样式。
     */
    layerOptions: null,

    /**
     * APIProperty: pixelTolerance
     * {Number} 绘制点像素容差。绘制点操作所允许的鼠标 down 和 up（包括普通的mousedown、mouseup和touchstart、touchend）
     * 事件之间的最大像素间隔。
     * 如果设置为有效的integer值，则当鼠标down和up之间间隔超过该值时将被忽略，不会添加点要素。默认值是 5。
     */
    pixelTolerance: 5,

    /**
     * Property: point
     * {<SuperMap.Feature.Vector>} The currently drawn point （当前鼠标位置点，即绘制点）
     */
    point: null,

    /**
     * Property: layer
     * {<SuperMap.Layer.Vector>} The temporary drawing layer
     */
    layer: null,

    /**
     * Property: multi
     * {Boolean} 在传递事件到图层leyer之前，为多个节点的几何对象创建feature要素实例。默认值是false。
     */
    multi: false,

    /**
     * Property: mouseDown
     * {Boolean} The mouse is down
     */
    mouseDown: false,

    /**
     * Property: stoppedDown
     * {Boolean} Indicate whether the last mousedown stopped the event
     * propagation.
     */
    stoppedDown: null,

    /**
     * Property: lastDown
     * {<SuperMap.Pixel>} Location of the last mouse down
     */
    lastDown: null,

    /**
     * Property: lastUp
     * {<SuperMap.Pixel>}
     */
    lastUp: null,

    /**
     * Property: persist
     * {Boolean} 保留呈现的feature要素直到destroyFeature方法被调用。默认为false。
     * 如果设置为true，那么feature会保持呈现，直到handler被设置为无效或者开启另一次绘制的时候调用destroyFeature方法来清除。
     */
    persist: false,

    /**
     * Property: stopDown
     * {Boolean} 停止鼠标mousedown事件的传播。在允许"绘制过程中平移"的时候必须设置为false。默认值为false。
     */
    stopDown: false,

    /**
     * Propery: stopUp
     * {Boolean} 停止鼠标事件的传播。在允许"拖拽过程中平移"的时候必须设置为false。默认值为false。
     */
    stopUp: false,

    /**
     * Property: touch
     * {Boolean} Indcates the support of touch events.
     */
    touch: false,

    /**
     * Property: lastTouchPx
     * {<SuperMap.Pixel>} The last pixel used to know the distance between
     * two touches (for double touch).
     */
    lastTouchPx: null,

    /**
     * Constructor: SuperMap.Handler.Plotting
     * 构造函数，创建一个新的绘制态势符号要素的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        if(!(options && options.layerOptions && options.layerOptions.styleMap)) {
            this.style = SuperMap.Util.extend(SuperMap.Feature.Vector.style['default'], {});
        }

        SuperMap.Handler.prototype.initialize.apply(this, arguments);
    },

    /**
     * APIMethod: activate
     * 激活事件处理器对象上的监听处理，如果这个事件处理器对象已经激活，则返回false.
     *
     * Returns:
     * {Boolean} 事件处理器对象监听激活成功.
     */
    activate: function() {
        if(!SuperMap.Handler.prototype.activate.apply(this, arguments)) {
            return false;
        }

        this.controlPoints = [];
        this.plotting = null;
        this.isDrawing = false;

        // create temporary vector layer for rendering geometry sketch
        // TBD: this could be moved to initialize/destroy - setting visibility here
        var options = SuperMap.Util.extend({
            displayInLayerSwitcher: false,
            // indicate that the temp vector layer will never be out of range
            // without this, resolution properties must be specified at the
            // map-level for this temporary layer to init its resolutions
            // correctly
            calculateInRange: SuperMap.Function.True
        }, this.layerOptions);
        this.layer = new SuperMap.Layer.Vector(this.CLASS_NAME, options);
        this.map.addLayer(this.layer);
        SuperMap.Element.addClass(
            this.map.viewPortDiv, "smDefault");
        return true;
    },

    /**
     * APIMethod: deactivate
     * 关闭事件处理器对象上的监听处理，如果这个事件处理器已经是关闭状态，则返回false
     *
     * Returns:
     * {Boolean} 事件处理器对象监听已经成功关闭。
     */
    deactivate: function() {
        if(!SuperMap.Handler.prototype.deactivate.apply(this, arguments)) {
            return false;
        }

        this.controlPoints = [];
        this.plotting = null;
        this.isDrawing = false;

        this.cancel();
        // If a layer's map property is set to null, it means that that layer
        // isn't added to the map. Since we ourself added the layer to the map
        // in activate(), we can assume that if this.layer.map is null it means
        // that the layer has been destroyed (as a result of map.destroy() for
        // example.
        if (this.layer.map != null) {
            //deactivate后，移除绘制时的鼠标样式
            SuperMap.Element.removeClass(
                this.map.viewPortDiv, "smDefault");
            this.destroyFeature(true);
            this.layer.destroy(false);
        }
        this.layer = null;
        this.touch = false;
        return true;
    },

    /**
     * APIMethod: createFeature
     * 创建标绘扩展符号。
     * 子类必须实现该方法，确定符号（plotting）的实例。eg:
     *
     *  this.plotting = new SuperMap.Feature.Vector(
     *
     *       //标绘扩展符号的 geometry 类型为 GeoCircle
     *
     *      new SuperMap.Geometry.GeoCircle()
     *
     *  );
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} 当前鼠标在地图上的像素位置.
     */
    createFeature: function(pixel) { },

    /**
     * APIMethod: modifyFeature
     * 绘制过程中修改标绘扩展符号形状。
     * 根据已添加（up函数中添加）的部分的控制点和由当前鼠标位置作为的一个临时控制点产生和符号。
     *
     * 子类视实际情况重写此方法（示例如 DoubleArrow 中的 modifyFeature ）。
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} 鼠标在地图上的当前像素位置
     */
    modifyFeature: function(pixel) {
        //忽略Chrome mouseup触发瞬间 mousemove 产生的相同点
        if (this.lastUp && this.lastUp.equals(pixel)) {
            return true;
        }

        //新建标绘扩展符号
        if(!this.point || !this.plotting) {
            this.createFeature(pixel);
        }

        //修改临时点的位置（鼠标位置）
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        this.point.geometry.x = lonlat.lon;
        this.point.geometry.y = lonlat.lat;

        if(this.isDrawing == true){
            var geometry = new SuperMap.Geometry.Point(
                lonlat.lon, lonlat.lat
            );

            var cp = this.controlPoints.concat([geometry]);
            //重新设置标绘扩展符号的控制点
            this.plotting.geometry._controlPoints = this.cloneControlPoints(cp);
            //重新计算标绘扩展符号的geometry
            this.plotting.geometry.calculateParts();
        }

        this.callback("modify", [this.point.geometry, this.getSketch(), false]);
        this.point.geometry.clearBounds();
        this.drawFeature();
    },

    /**
     * Method: up
     *  操作 mouseup 和 touchend，
     * 发送最后一个 mouseup 点。
     *
     * 子类必须实现此方法。此方法添加符号的控制点 ，根基实际的符号。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) { },

    /**
     * APIMethod: down
     * Handle mousedown and touchstart.  Adjust the geometry and redraw.
     * Return determines whether to propagate the event on the map.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    down: function(evt) {
        this.mouseDown = true;
        this.lastDown = evt.xy;
        if(!this.touch) {
            this.modifyFeature(evt.xy);
        }
        this.stoppedDown = this.stopDown;
        return !this.stopDown;
    },

    /**
     * APIMethod: move
     * Handle mousemove and touchmove.  Adjust the geometry and redraw.
     * Return determines whether to propagate the event on the map.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    move: function (evt) {
        if(!this.touch // no point displayed until up on touch devices
            && (!this.mouseDown || this.stoppedDown)) {
            this.modifyFeature(evt.xy);
        }
        return true;
    },

    /**
     * Method: click
     * Handle clicks.  Clicks are stopped from propagating to other listeners
     *     on map.events or other dom elements.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    click: function(evt) {
        SuperMap.Event.stop(evt);
        return false;
    },

    /**
     * Method: dblclick
     * Handle double-clicks.  Double-clicks are stopped from propagating to other
     *     listeners on map.events or other dom elements.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    dblclick: function(evt) {
        SuperMap.Event.stop(evt);
        return false;
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 1) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: addControlPoint
     * 向 controlPoints 添加控制点
     */
    addControlPoint: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.controlPoints.push(geometry);
    },

    /**
     * Method: drawFeature
     * Render features on the temporary layer.
     */
    drawFeature: function() {
        this.layer.renderer.clear();
        this.layer.drawFeature(this.plotting, this.style);
        this.layer.drawFeature(this.point, this.style);
    },

    /**
     * Method: getSketch
     * Return the sketch feature.
     *
     * Returns:
     * {<SuperMap.Feature.Vector>}
     */
    getSketch: function() {
        return this.plotting;
    },

    /**
     * Method: destroyFeature
     * Destroy the temporary geometries
     *
     * Parameters:
     * force - {Boolean} Destroy even if persist is true.
     */
    destroyFeature: function(force) {
        if(this.layer && (force || !this.persist)) {
            this.layer.destroyFeatures();
        }
        this.point = null;
        this.plotting = null;
    },

    /**
     * Method: finalize
     * Finish the geometry and call the "done" callback.
     *
     * Parameters:
     * cancel - {Boolean} Call cancel instead of done callback.  Default
     *          is false.
     */
    finalize: function(cancel) {
        var key = cancel ? "cancel" : "done";
        this.mouseDown = false;
        this.lastDown = null;
        this.lastUp = null;
        this.lastTouchPx = null;
        this.callback(key, [this.geometryClone()]);
        this.destroyFeature(cancel);
    },

    /**
     * APIMethod: cancel
     * 结束绘制操作并且调用cancel回调
     */
    cancel: function() {
        this.finalize(true);
    },

    /**
     * Method: getGeometry
     * Return the sketch geometry.
     *
     * Returns:
     * {<SuperMap.Geometry.Point>}
     */
    getGeometry: function() {
        if(this.plotting && this.plotting.geometry){
            return this.plotting.geometry;
        }
    },

    /**
     * Method: geometryClone
     * Return a clone of the geometry.
     *
     * Returns:
     * {<SuperMap.Geometry>}
     */
    geometryClone: function() {
        var geom = this.getGeometry();
        if(geom && geom._controlPoints){
            var geo =  geom.clone();
            geo.calculateParts();
            return geo;
        }
    },

    /**
     * Method: mousedown
     * Handle mousedown.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    mousedown: function(evt) {
        return this.down(evt);
    },

    /**
     * Method: touchstart
     * Handle touchstart.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    touchstart: function(evt) {
        if (!this.touch) {
            this.touch = true;
            // unregister mouse listeners
            this.map.events.un({
                mousedown: this.mousedown,
                mouseup: this.mouseup,
                mousemove: this.mousemove,
                click: this.click,
                dblclick: this.dblclick,
                scope: this
            });
        }
        this.lastTouchPx = evt.xy;
        return this.down(evt);
    },

    /**
     * Method: mousemove
     * Handle mousemove.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    mousemove: function(evt) {
        return this.move(evt);
    },

    /**
     * Method: touchmove
     * Handle touchmove.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    touchmove: function(evt) {
        this.lastTouchPx = evt.xy;
        return this.move(evt);
    },

    /**
     * Method: mouseup
     * Handle mouseup.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    mouseup: function(evt) {
        return this.up(evt);
    },

    /**
     * Method: touchend
     * Handle touchend.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    touchend: function(evt) {
        evt.xy = this.lastTouchPx;
        return this.up(evt);
    },

    /**
     * Method: mouseout
     * Handle mouse out.  For better user experience reset mouseDown
     * and stoppedDown when the mouse leaves the map viewport.
     *
     * Parameters:
     * evt - {Event} The browser event
     */
    mouseout: function(evt) {
        if(SuperMap.Util.mouseLeft(evt, this.map.eventsDiv)) {
            this.stoppedDown = this.stopDown;
            this.mouseDown = false;
        }
    },

    /**
     * Method: passesTolerance
     * Determine whether the event is within the optional pixel tolerance.
     *
     * Returns:
     * {Boolean} The event is within the pixel tolerance (if specified).
     */
    passesTolerance: function(pixel1, pixel2, tolerance) {
        var passes = true;

        if (tolerance != null && pixel1 && pixel2) {
            var dist = pixel1.distanceTo(pixel2);
            if (dist > tolerance) {
                passes = false;
            }
        }
        return passes;
    },

    /**
     * Method: cloneControlPoints
     * 克隆控制点数组
     *
     * Parameters:
     * cp - {<SuperMap.Geometry.Point>} 要进行克隆的控制点数组
     */
    cloneControlPoints: function(cp){
        var controlPoints = [];

        for(var i = 0; i < cp.length; i++){
            controlPoints.push(cp[i].clone());
        }

        return controlPoints;
    },

    CLASS_NAME: "SuperMap.Handler.Plotting"
});/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoCircle.js
 */

/**
 * Class: SuperMap.Handler.GeoCircle
 * 在地图上绘制圆的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，在鼠标第二次松开后完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.GeoCircle> 构造函数可以创建一个新的绘制圆的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.CircleEx = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.CircleEx
     * 构造函数，创建一个新的绘制圆的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoCircle
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoCircle()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        // ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }
            else if(len == 2){
                this.finalize();
                this.isDrawing = false;
                this.controlPoints = [];
                this.layer.removeAllFeatures();
            }

            return true;
        } else {
            return true;
        }
    },

    CLASS_NAME: "SuperMap.Handler.CircleEx"
});


/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoCurveFlag.js
 */

/**
 * Class: SuperMap.Handler.CurveFlag
 * 在地图上绘制曲线旗标的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，在鼠标第二次松开后完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.CurveFlag> 构造函数可以创建一个新的绘制曲线旗标的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.CurveFlag = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.CurveFlag
     * 构造函数，创建一个新的绘制曲线旗标的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoCurveFlag
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoCurveFlag()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        // ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }
            else if(len == 2){
                this.finalize();
                this.isDrawing = false;
                this.controlPoints = [];
                this.layer.removeAllFeatures();
            }
            else{
                this.isDrawing = false;
                this.controlPoints = [];
                this.plotting = null
            }

            return true;
        } else {
            return true;
        }
    },

    CLASS_NAME: "SuperMap.Handler.CurveFlag"
});


/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoDiagonalArrow.js
 */

/**
 * Class: SuperMap.Handler.DiagonalArrow
 * 在地图上绘制斜箭头的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，在鼠标第四次松开后完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.DiagonalArrow> 构造函数可以创建一个新的绘制斜箭头的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.DiagonalArrow = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.DiagonalArrow
     * 构造函数，创建一个新的绘制斜箭头的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoDiagonalArrow
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoDiagonalArrow()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: down
     * Handle mousedown and touchstart.  Add a new point to the geometry and
     * render it. Return determines whether to propagate the event on the map.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    down: function(evt) {
        this.mouseDown = true;
        this.lastDown = evt.xy;
        if(this.touch) { // no point displayed until up on touch devices
            this.modifyFeature(evt.xy);
            SuperMap.Event.stop(evt);
        }
        this.stoppedDown = this.stopDown;
        return !this.stopDown;
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        //ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }

            return true;
        } else {
            return true;
        }
    },

    /**
     * Method: dblclick
     * Handle double-clicks.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    dblclick: function(evt) {
        this.finalize();
        this.isDrawing = false;
        this.controlPoints = [];
        this.layer.removeAllFeatures();
        return false;
    },

    CLASS_NAME: "SuperMap.Handler.DiagonalArrow"
});


/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoDoubleArrow.js
 */

/**
 * Class: SuperMap.Handler.DoubleArrow
 * 在地图上绘制双箭头的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，双击鼠标完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.DoubleArrow> 构造函数可以创建一个新的绘制双箭头的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.DoubleArrow = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.DoubleArrow
     * 构造函数，创建一个新的绘制双箭头的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoDoubleArrow
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoDoubleArrow()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * APIMethod: modifyFeature
     * 针对双箭头重新父类此方法。
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} 鼠标在地图上的当前像素位置
     */
    modifyFeature: function(pixel) {
        //忽略Chrome mouseup触发瞬间 mousemove 产生的相同点
        if (this.lastUp && this.lastUp.equals(pixel)) {
            return true;
        }

        //新建标绘扩展符号
        if(!this.point || !this.plotting) {
            this.createFeature(pixel);
        }

        //修改临时点的位置
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        this.point.geometry.x = lonlat.lon;
        this.point.geometry.y = lonlat.lat;

        if(this.isDrawing == true){
            var geometry = new SuperMap.Geometry.Point(
                lonlat.lon, lonlat.lat
            );

            var len = this.controlPoints.length;
            if(len == 2){
                var offX = this.controlPoints[1].x - this.controlPoints[0].x;
                var offY = this.controlPoints[1].y - this.controlPoints[0].y;

                //第四个控制点
                var geometry2 = new SuperMap.Geometry.Point(
                    (lonlat.lon - offX), (lonlat.lat - offY)
                );
                var cp = this.controlPoints.concat([geometry, geometry2]);
            }
            else if(len == 3){
                var cp = this.controlPoints.concat([geometry]);
            }
            //重新设置标绘扩展符号的控制点
            this.plotting.geometry._controlPoints = this.cloneControlPoints(cp);
            //重新计算标绘扩展符号的geometry
            this.plotting.geometry.calculateParts();
        }

        this.callback("modify", [this.point.geometry, this.getSketch(), false]);
        this.point.geometry.clearBounds();
        this.drawFeature();
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        // ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){ }
            else if(len == 2 || len == 3){
                this.isDrawing = true;
            }
            else if(len == 4){
                this.finalize();
                this.isDrawing = false;
                this.controlPoints = [];
                this.layer.removeAllFeatures();
            }
            else{
                this.isDrawing = false;
                this.controlPoints = [];
                this.plotting = null
            }

            return true;
        } else {
            return true;
        }
    },

    CLASS_NAME: "SuperMap.Handler.DoubleArrow"
});


/**
 * @requires SuperMap/Handler.js
 * @requires SuperMap/Geometry/GeoRectFlag.js
 */

/**
 * Class: SuperMap.Handler.RectFlag
 * 在地图上绘制直箭头的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，在鼠标第二次松开后完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.RectFlag> 构造函数可以创建一个新的绘制直箭头的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.RectFlag = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.RectFlag
     * 构造函数，创建一个新的绘制直角旗标的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoRectFlag
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoRectFlag()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        // ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }
            else if(len == 2){
                this.finalize();
                this.isDrawing = false;
                this.controlPoints = [];
                this.layer.removeAllFeatures();
            }
            else{
                this.isDrawing = false;
                this.controlPoints = [];
                this.plotting = null
            }

            return true;
        } else {
            return true;
        }
    },

    CLASS_NAME: "SuperMap.Handler.RectFlag"
});


/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoStraightArrow.js
 */

/**
 * Class: SuperMap.Handler.StraightArrow
 * 在地图上绘制直箭头的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，双击鼠标完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.StraightArrow> 构造函数可以创建一个新的绘制直箭头的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.StraightArrow = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.StraightArrow
     * 构造函数，创建一个新的绘制直箭头的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoStraightArrow
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoStraightArrow()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: down
     * Handle mousedown and touchstart.  Add a new point to the geometry and
     * render it. Return determines whether to propagate the event on the map.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    down: function(evt) {
        this.mouseDown = true;
        this.lastDown = evt.xy;
        if(this.touch) { // no point displayed until up on touch devices
            this.modifyFeature(evt.xy);
            SuperMap.Event.stop(evt);
        }
        this.stoppedDown = this.stopDown;
        return !this.stopDown;
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        //ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }

            return true;
        } else {
            return true;
        }
    },

    /**
     * Method: dblclick
     * Handle double-clicks.
     *
     * Parameters:
     * evt - {Event} The browser event
     *
     * Returns:
     * {Boolean} Allow event propagation
     */
    dblclick: function(evt) {
        this.finalize();
        this.isDrawing = false;
        this.controlPoints = [];
        this.layer.removeAllFeatures();
        return false;
    },

    CLASS_NAME: "SuperMap.Handler.StraightArrow"
});


/**
 * @requires SuperMap/Handler/Plotting.js
 * @requires SuperMap/Geometry/GeoTriangleFlag.js
 */

/**
 * Class: SuperMap.Handler.TriangleFlag
 * 在地图上绘制三角旗标的事件处理器。
 * 绘制点在激活后显示，随着鼠标移动而移动，在鼠标第一次松开后开始绘制，在鼠标第二次松开后完成绘制。
 * 该处理器会触发标记为"done"、"cancel"和“modify"的事件回调。其中modify回调会在每一次变化时被调用并传入最近一次绘制的点。
 * 使用 <SuperMap.Handler.TriangleFlag> 构造函数可以创建一个新的绘制三角旗标的事件处理器实例。
 *
 * Inherits from:
 *  - <SuperMap.Handler>
 */
SuperMap.Handler.TriangleFlag = SuperMap.Class(SuperMap.Handler.Plotting, {
    /**
     * Constructor: SuperMap.Handler.TriangleFlag
     * 构造函数，创建一个新的绘制三角旗标的事件处理器。
     *
     * Parameters:
     * control - {<SuperMap.Control>} 构建当前事件处理器的控件对象。
     * callbacks - {Object} 回调函数对象。关于回调的具体描述参见下文。
     * options - {Object} 一个可选对象，其属性将会赋值到事件处理器对象上。
     *
     * Named callbacks:
     * create - 当要素草图第一次创建的时候调用，回调函数需接收两个参数：当前点几何对象、当前要素。
     * modify - 顶点的每一次变化时调用，回调函数接受参数：几何点对象、当前要素。
     * done - 当绘制点操作完成时调用，回调函数接收一个参数，当前点的几何对象。
     * cancel - 绘制过程中关闭当前事件处理器的监听时调用，回调函数接收当前要素的几何对象作为参数。
     */
    initialize: function(control, callbacks, options) {
        SuperMap.Handler.Plotting.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: createFeature
     * create temporary features
     *
     * Parameters:
     * pixel - {<SuperMap.Pixel>} A pixel location on the map.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new SuperMap.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new SuperMap.Feature.Vector(geometry);

        //标绘扩展符号的 geometry 类型为 GeoTriangleFlag
        this.plotting = new SuperMap.Feature.Vector(
            new SuperMap.Geometry.GeoTriangleFlag()
        );

        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },

    /**
     * Method: destroyPersistedFeature
     * Destroy the persisted feature.
     */
    destroyPersistedFeature: function() {
        var layer = this.layer;
        if(layer && layer.features.length > 2) {
            this.layer.features[0].destroy();
        }
    },

    /**
     * Method: up
     * 操作 mouseup 和 touchend.
     * 发送最后一个 mouseup 点。
     *
     * Parameters:
     * evt - {Event} 浏览器事件，evt.xy 为最后一个 mouseup 的像素位置。
     *
     * Returns:
     * {Boolean} 是否允许事件继续在 map 上传送
     */
    up: function (evt) {
        this.mouseDown = false;
        this.stoppedDown = this.stopDown;

        // ignore double-clicks
        if (this.lastUp && this.lastUp.equals(evt.xy)) {
            return true;
        }

        if (this.lastDown && this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) {
            if (this.touch) {
                this.modifyFeature(evt.xy);
            }
            if(this.persist) {
                this.destroyPersistedFeature();
            }
            this.lastUp = evt.xy;

            this.addControlPoint(evt.xy);
            var len = this.controlPoints.length;
            if(len == 1){
                this.isDrawing = true;
            }
            else if(len == 2){
                this.finalize();
                this.isDrawing = false;
                this.controlPoints = [];
                this.layer.removeAllFeatures();
            }
            else{
                this.isDrawing = false;
                this.controlPoints = [];
                this.plotting = null
            }

            return true;
        } else {
            return true;
        }
    },

    CLASS_NAME: "SuperMap.Handler.TriangleFlag"
});


/**
 * @requires SuperMap/Control/DragFeature.js
 * @requires SuperMap/Control/SelectFeature.js
 */

/**
 * Class: SuperMap.Control.PlottingEdit
 * 标绘扩展符号编辑控件。
 * 
 * 该控件激活时，单击即可选中标绘扩展符号，被选中的符号将显示其控制点，拖拽这些控制点以编辑标绘扩展符号，拖拽符号本身平移符号。
 *
 * 通过 active 和 deactive 两个方法，实现动态的激活和注销。
 *
 * Inherits From:
 *  - <SuperMap.Control>
 */
SuperMap.Control.PlottingEdit = SuperMap.Class(SuperMap.Control, {
    /**
     * Constant: EVENT_TYPES
     * 支持的事件类型:
     *  - *beforefeaturemodified* 当图层上的要素（标绘扩展符号）开始编辑前触发该事件。
     *  - *featuremodified* 当图层上的要素（标绘扩展符号）编辑时触发该事件。
     *  - *afterfeaturemodified* 当图层上的要素（标绘扩展符号）编辑完成时，触发该事件。
     */
    EVENT_TYPES: ["beforefeaturemodified", "featuremodified", "afterfeaturemodified"],

    /**
     * APIProperty: clickout
     * {Boolean} 是否在要素区域外点击鼠标，取消选择要素。默认为true。
     */
    clickout: true,

    /**
     * APIProperty: controlPointsStyle
     * {String} 控制点style。
     *
     * controlPointsStyle的可设属性如下：
     * fillColor - {String} 十六进制填充颜色，默认为"#ee9900"。
     * fillOpacity - {Number} 填充不透明度。默认为0.4。
     * strokeColor - {String} 十六进制描边颜色。
     * strokeOpacity - {Number} 描边的不透明度(0-1),默认为0.4。
     * strokeWidth - {Number} 像素描边宽度，默认为1。
     * pointRadius - {Number} 像素点半径，默认为6
     */
    controlPointsStyle: null,

    /**
     * Property: defaultStyle
     * {Boolean} 控制点默认 style。
     */
    defaultStyle:  {
        fillColor: "#ee9900",
        fillOpacity: 0.4,
        strokeColor: "#ee9900",
        strokeOpacity: 1,
        strokeWidth: 1,
        pointRadius: 6
    },

    /**
     * Property: controlPoints
     * 标绘扩展符号的控制点
     */
    controlPoints: [],

    /**
     * Property: layer
     * {<SuperMap.Layer.Vector>}
     */
    layer: null,

    /**
     * Property: feature
     * {<SuperMap.Feature.Vector>} Feature（plotting symbol）currently available for modification.
     */
    feature: null,

    /**
     * Property: selectControl
     * {<SuperMap.Control.SelectFeature>}
     */
    selectControl: null,

    /**
     * Property: dragControl
     * {<SuperMap.Control.DragFeature>}
     */
    dragControl: null,

    /**
     * Property: modified
     * {Boolean} The currently selected feature has been modified.
     */
    modified: false,

    /**
     * Constructor: SuperMap.Control.PlottingEdit
     * 创建该控件的新实例。
     *
     * Parameters:
     * layer - {<SuperMap.Layer.Vector>} 执行编辑的图层。
     * options - {Object} 设置该类开放的属性值。
     *
     * 创建 PlottingEdit 控件新实例的方法如下所示：
     * (start code)
     * //定义一个矢量图层 vectorLayer 进行符号的编辑
     * var vectorLayer = new SuperMap.Layer.Vector("vector Layer");
     * //实例化一个 plottingEdit 控件
     * var plottingEdit = new SuperMap.Control.PlottingEdit(vectorLayer);
     * //地图上添加控件
     * map.addControl(plottingEdit);
     * //激活 plottingEdit 控件
     * plottingEdit.activate();
     * (end)
     */
    initialize: function(layer, options) {
        options = options || {};
        this.layer = layer;
        this.controlPoints = [];
        SuperMap.Control.prototype.initialize.apply(this, [options]);

        var control = this;

        // configure the select control
        var selectOptions = {
            clickout: this.clickout,
            toggle: false,
            onBeforeSelect: this.beforeSelectFeature,
            onSelect: this.selectFeature,
            onUnselect: this.unselectFeature,
            scope: this
        };
        this.selectControl = new SuperMap.Control.SelectFeature(
            layer, selectOptions
        );

        // configure the drag control
        var dragOptions = {
            onStart: function(feature, pixel) {
                control.dragStart.apply(control, [feature, pixel]);
            },
            onDrag: function(feature, pixel) {
               control.dragControlPoint.apply(control, [feature, pixel]);
            },
            onComplete: function(feature) {
                control.dragComplete.apply(control, [feature]);
            },
            featureCallbacks: {
                over: function(feature) {
                    control.dragControl.overFeature.apply(
                        control.dragControl, [feature]);
                }
            }
        };
        this.dragControl = new SuperMap.Control.DragFeature(
            layer, dragOptions
        );
    },

    /**
     * APIMethod: destroy
     * 销毁该类，释放空间。
     */
    destroy: function() {
        this.controlPoints = [];
        this.layer = null;
        this.selectControl.destroy();
        this.dragControl.destroy();
        SuperMap.Control.prototype.destroy.apply(this, []);
    },

    /**
     * APIMethod: activate
     * 激活该控件。
     *
     * Returns:
     * {Boolean} 激活控件是否成功。
     */
    activate: function() {
        return (this.selectControl.activate() &&
            SuperMap.Control.prototype.activate.apply(this, arguments));
    },

    /**
     * APIMethod: deactivate
     * 取消激活控件，使其不可用。
     *
     * Returns:
     * {Boolean} 返回操作是否成功。
     */
    deactivate: function() {
        var deactivated = false;
        // the return from the controls is unimportant in this case
        if(SuperMap.Control.prototype.deactivate.apply(this, arguments)) {
            this.layer.removeFeatures(this.controlPoints, {silent: true});
            this.controlPoints = [];
            this.dragControl.deactivate();
            var feature = this.feature;
            var valid = feature && feature.geometry && feature.layer;

            if(valid) {
                this.selectControl.unselect.apply(this.selectControl,
                    [feature]);
            }
            this.selectControl.deactivate();

            deactivated = true;
        }
        return deactivated;
    },

    /**
     * APIMethod: deleteSymbol
     * 删除标绘扩展符号 (选中)
     *
     * Returns:
     * {Boolean} 返回操作是否成功。
     */
    deleteSymbol: function(){
        if(this.feature && this.controlPoints && this.controlPoints.length > 0){
            this.layer.destroyFeatures(this.feature);
            this.layer.destroyFeatures(this.controlPoints);
            this.unselectFeature(this.feature);
            return true;
        }
        else{
            return false;
        };
    },

    /**
     * APIMethod: selectFeature
     * 选择需要编辑的要素。
     *
     * Parameters:
     * feature - {<SuperMap.Feature.Vector>} 要选中的要素。
     */
    selectFeature: function(feature) {
        if (this.beforeSelectFeature(feature) !== false) {
            if(feature.geometry instanceof SuperMap.Geometry.GeoPlotting){
                this.feature = feature;
                this.modified = false;
                this.resetControlPoints();
                this.dragControl.activate();
            }
        }
    },

    /**
     * APIMethod: unselectFeature
     * 取消选择编辑的要素。
     *
     * Parameters:
     * feature - {<SuperMap.Feature.Vector>} The unselected feature.
     */
    unselectFeature: function(feature) {
        this.layer.removeFeatures(this.controlPoints, {silent: true});
        this.controlPoints = [];
        this.feature = null;
        this.dragControl.deactivate();
        this.layer.events.triggerEvent("afterfeaturemodified", {
            feature: feature,
            modified: this.modified
        });
        this.modified = false;
    },

    /**
     * Method: beforeSelectFeature
     * Called before a feature is selected.
     *
     * Parameters:
     * feature - {<SuperMap.Feature.Vector>} The feature（plotting symbol） about to be selected.
     */
    beforeSelectFeature: function(feature) {
        return this.layer.events.triggerEvent(
            "beforefeaturemodified", {feature: feature}
        );
    },

    /**
     * Method: dragStart
     * Called by the drag feature control with before a feature is dragged.
     *
     * Parameters:
     * feature - {<SuperMap.Feature.Vector>} The control point or plotting symbol about to be dragged.
     * pixel - {<SuperMap.Pixel>} Pixel location of the mouse event.
     */
    dragStart: function(feature, pixel) {
        if(feature != this.feature && feature.geometry instanceof SuperMap.Geometry.GeoPlotting
            && this.feature.geometry instanceof SuperMap.Geometry.GeoPlotting) {
            if(this.feature) {
                this.selectControl.clickFeature.apply(this.selectControl,
                    [this.feature]);
            }
            this.selectControl.clickFeature.apply(
                this.selectControl, [feature]);
            this.dragControl.overFeature.apply(this.dragControl,
                [feature]);
            this.dragControl.lastPixel = pixel;
            this.dragControl.handlers.drag.started = true;
            this.dragControl.handlers.drag.start = pixel;
            this.dragControl.handlers.drag.last = pixel;
        }

        this._dragPixel = pixel;
        //鼠标手势，IE7、8中需重新设置cursor
        SuperMap.Element.removeClass(this.map.viewPortDiv, "smDragDown" );
        this.map.viewPortDiv.style.cursor="pointer";
    },

    /**
     * Method: dragControlPoint
     * Called by the drag feature control with each drag move of a control point or a plotting symbol.
     *
     * Parameters:
     * cp - {<SuperMap.Feature.Vector>} The control point being dragged.
     * pixel - {<SuperMap.Pixel>} Pixel location of the mouse event.
     */
    dragControlPoint: function(cp, pixel) {
        //拖拽控制点时编辑符号，拖拽符号本身时平移符号（平移符号的所有控制控制点）
        if(cp.geometry.CLASS_NAME == "SuperMap.Geometry.Point") {
            this.modified = true;

            //拖拽控制点过程中改变符号的Geometry
            var geo = this.feature.geometry;
            geo._controlPoints = this.getCpGeos();
            geo.calculateParts();

            //绘制符号及控制点
            this.layer.drawFeature(this.feature);
            this.layer.drawFeature(cp);
        }
         else if(cp.geometry instanceof SuperMap.Geometry.GeoPlotting){
            this.modified = true;

            //平移的时候不显示控制点
            this.layer.removeFeatures(this.controlPoints, {silent: true});

            //当前位置
            var lonLat=this.layer.getLonLatFromViewPortPx(pixel);
            //拖拽开始的位置
            var ll=this.layer.getLonLatFromViewPortPx(this._dragPixel);

            var cps =  this.getCpGeos();
            for(var i = 0, len = cps.length; i < len; i ++){
                var cp = cps[i];
                //平移控制点（符号geometry的平移在拖拽控件中完成）
                cp.x +=  lonLat.lon-ll.lon;
                cp.y += lonLat.lat-ll.lat;
            }
            var geo = this.feature.geometry;
            geo._controlPoints = cps;
            //geo.calculateParts();
            this._dragPixel = pixel;
        }
    },

    /**
     * Method: dragComplete
     * Called by the drag feature control when the dragging is complete.
     */
    dragComplete: function() {
        delete this._dragPixel;
        this.resetControlPoints();
        this.setFeatureState();
        this.layer.events.triggerEvent("featuremodified",
            {feature: this.feature});
    },

    /**
     * Method: setFeatureState
     * Called when the feature is modified.  If the current state is not
     *     INSERT or DELETE, the state is set to UPDATE.
     */
    setFeatureState: function() {
        if(this.feature.state != SuperMap.State.INSERT &&
            this.feature.state != SuperMap.State.DELETE) {
            this.feature.state = SuperMap.State.UPDATE;
        }
    },

    /**
     * Method: resetControlPoints
     * 重设控制点
     */
    resetControlPoints: function() {
        //移除当前控制点
        if(this.controlPoints.length > 0) {
            this.layer.removeFeatures(this.controlPoints, {silent: true});
            this.controlPoints = [];
        }
        //重设控制点
        this.collectControlPoints();
    },

    /**
     * Method: collectControlPoints
     * Collect the control points from the modifiable plotting symbol's geometry and push
     *     them on to the control's controlPoints array.
     */
    collectControlPoints: function() {
        if(!this.feature || !this.feature.geometry) return;
        this.controlPoints = [];
        var control = this;

        //重设符号 geometry 的 控制点
        function collectGeometryControlPoints(geometry) {
            var i, controlPoi, cp;
            if(geometry instanceof SuperMap.Geometry.GeoPlotting){
                var numCont = geometry._controlPoints.length;
                for(i=0; i<numCont; ++i) {
                    cp = geometry._controlPoints[i];
                    if(cp.CLASS_NAME == "SuperMap.Geometry.Point") {
                        controlPoi = new SuperMap.Feature.Vector(cp);
                        controlPoi._sketch = true;
                        controlPoi.style = SuperMap.Util.copyAttributes(controlPoi.style, control.defaultStyle);
                        if(control.controlPointsStyle){
                            controlPoi.style = SuperMap.Util.copyAttributes(controlPoi.style, control.controlPointsStyle);
                        }
                        control.controlPoints.push(controlPoi);
                    }
                }
            }
        }

        collectGeometryControlPoints.call(this, this.feature.geometry);
        this.layer.addFeatures(this.controlPoints, {silent: true});
    },





    /**
     * Method: setMap
     * Set the map property for the control and all handlers.
     *
     * Parameters:
     * map - {<SuperMap.Map>} The control's map.
     */
    setMap: function(map) {
        this.selectControl.setMap(map);
        this.dragControl.setMap(map);
        SuperMap.Control.prototype.setMap.apply(this, arguments);
    },

    /**
     * Method: getCpGeos
     * 从 this.controlPoints 中获取出 Geometry 控制点数组
     *
     */
    getCpGeos: function(){
        var cpFeas = this.controlPoints;
        var cpGeos = [];

        for(var i = 0; i < cpFeas.length; i++){
            cpGeos.push(cpFeas[i].geometry);
        }

        return cpGeos;
    },

    /**
     * Method: cloneControlPoints
     * 克隆控制点数组
     *
     * Parameters:
     * cp - {<SuperMap.Geometry.Point>} 要进行克隆的控制点数组
     */
    cloneControlPoints: function(cp){
        var controlPoints = [];

        for(var i = 0; i < cp.length; i++){
            controlPoints.push(cp[i].clone());
        }

        return controlPoints;
    },

    /**
     * Method: controlPointsToJSON
     * 当前符号（this.feature）的控制点（geometry._controlPoints）转为json数据。
     * (用于测试的方法)
     */
    controlPointsToJSON: function(){
       if(this.feature && this.feature.geometry &&
           this.feature.geometry instanceof SuperMap.Geometry.GeoPlotting){
            return this.feature.geometry.toJSON();
       }
    },

    CLASS_NAME: "SuperMap.Control.PlottingEdit"
});